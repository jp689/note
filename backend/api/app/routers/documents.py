from __future__ import annotations

from pathlib import PurePath
from urllib.parse import quote
from uuid import uuid4

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, Response
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Document, KnowledgeNode as KnowledgeNodeModel, MindMapGraph as MindMapGraphModel, TaskJob, User
from ..queueing import enqueue_document_job
from ..schemas import (
    DocumentProcessResponse,
    DocumentSummary,
    KnowledgeNode,
    MindMapGraph,
    PipelineCompleteRequest,
    QuizSession,
    SearchResult,
    UploadContentResponse,
    UploadDocumentRequest,
    UploadDocumentResponse,
)
from ..security import get_current_user, require_worker_token
from ..services.pipeline import (
    apply_pipeline_result,
    document_to_summary,
    get_latest_quiz,
    knowledge_to_schema,
    mindmap_to_schema,
    process_document_inline,
    quiz_to_schema,
    search_knowledge,
)
from ..storage import storage

router = APIRouter(prefix="/api", tags=["documents"])


def _upload_too_large_error() -> HTTPException:
    max_mb = settings.max_upload_bytes / 1024 / 1024
    return HTTPException(
        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        detail=f"Uploaded file must not exceed {max_mb:.0f} MB",
    )


def _normalized_pdf_content_type(content_type: str) -> str:
    return content_type.split(";", 1)[0].strip().lower()


def _safe_pdf_filename(filename: str) -> str:
    clean_name = filename.strip()
    if (
        not clean_name
        or clean_name in {".", ".."}
        or "/" in clean_name
        or "\\" in clean_name
        or PurePath(clean_name).name != clean_name
        or any(ord(character) < 32 for character in clean_name)
    ):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid PDF filename")
    if len(clean_name) > 255:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="PDF filename is too long")
    if not clean_name.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF uploads are supported",
        )
    return clean_name


def _inline_pdf_disposition(filename: str) -> str:
    fallback = filename.encode("ascii", "ignore").decode("ascii").replace('"', "").strip() or "document.pdf"
    return f"inline; filename=\"{fallback}\"; filename*=UTF-8''{quote(filename)}"


async def _read_limited_body(request: Request) -> bytes:
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            declared_size = int(content_length)
        except ValueError as error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Content-Length header") from error
        if declared_size > settings.max_upload_bytes:
            raise _upload_too_large_error()

    chunks: list[bytes] = []
    received_bytes = 0
    async for chunk in request.stream():
        if not chunk:
            continue
        received_bytes += len(chunk)
        if received_bytes > settings.max_upload_bytes:
            raise _upload_too_large_error()
        chunks.append(chunk)
    return b"".join(chunks)


@router.post("/documents/upload", response_model=UploadDocumentResponse)
def upload_document(
    payload: UploadDocumentRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UploadDocumentResponse:
    filename = _safe_pdf_filename(payload.filename)
    content_type = _normalized_pdf_content_type(payload.content_type)
    if content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF uploads are supported",
        )
    if payload.size_bytes <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file must not be empty",
        )
    if payload.size_bytes > settings.max_upload_bytes:
        raise _upload_too_large_error()

    document_id = f"doc-{uuid4().hex[:10]}"
    document = Document(
        id=document_id,
        user_id=user.id,
        title=filename,
        file_key=f"documents/{user.id}/{document_id}/{filename}",
        file_name=filename,
        file_size=payload.size_bytes,
        mime_type=content_type,
        status="uploaded",
        progress_label="File uploaded and waiting for processing",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return UploadDocumentResponse(document=document_to_summary(document), upload_url=f"/api/documents/{document.id}/content")


@router.get("/documents", response_model=list[DocumentSummary])
def list_documents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[DocumentSummary]:
    documents = db.scalars(
        select(Document).where(Document.user_id == user.id).order_by(desc(Document.created_at))
    ).all()
    return [document_to_summary(document) for document in documents]


@router.put("/documents/{document_id}/content", response_model=UploadContentResponse)
async def upload_document_content(
    document_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UploadContentResponse:
    document = db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    content = await _read_limited_body(request)
    content_type = _normalized_pdf_content_type(request.headers.get("content-type", ""))
    if not content:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Uploaded file must not be empty")
    if content_type != "application/pdf" or b"%PDF-" not in content[:1024]:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only PDF uploads are supported")

    storage.put_bytes(document.file_key, content, content_type)
    document.status = "uploaded"
    document.file_size = len(content)
    document.progress_label = "PDF received and ready for processing"
    db.commit()
    db.refresh(document)
    return UploadContentResponse(document=document_to_summary(document), received_bytes=len(content))


@router.post("/documents/{document_id}/process", response_model=DocumentProcessResponse)
def trigger_document_processing(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DocumentProcessResponse:
    document = db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    job = TaskJob(
        id=f"job-{uuid4().hex[:12]}",
        document_id=document.id,
        user_id=user.id,
        type="process_document",
        status="queued",
        payload={
            "job_id": "",
            "document_id": document.id,
            "user_id": user.id,
            "title": document.title,
            "storage_key": document.file_key,
            "source_type": "pdf",
        },
    )
    job.payload["job_id"] = job.id
    db.add(job)

    if settings.process_inline:
        db.commit()
        processed = process_document_inline(db, document, job)
        return DocumentProcessResponse(
            document_id=document.id,
            status=processed.status,
            queued=False,
            message="Document processed inline for the current environment.",
            job_id=job.id,
        )

    document.status = "parsing"
    document.progress_label = "已加入处理队列，等待 worker 执行"
    db.commit()
    queued = enqueue_document_job(job.payload)
    if not queued:
        process_document_inline(db, document, job)
        return DocumentProcessResponse(
            document_id=document.id,
            status="quiz_ready",
            queued=False,
            message="Redis unavailable; document processed inline with deterministic fallback.",
            job_id=job.id,
        )
    return DocumentProcessResponse(
        document_id=document.id,
        status=document.status,
        queued=True,
        message="Document queued for worker processing.",
        job_id=job.id,
    )


@router.get("/documents/{document_id}/status", response_model=DocumentSummary)
def get_document_status(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DocumentSummary:
    document = db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    job = db.scalar(select(TaskJob).where(TaskJob.document_id == document.id).order_by(desc(TaskJob.created_at)))
    return document_to_summary(document, job.id if job else None)


@router.get("/documents/{document_id}/quiz", response_model=QuizSession)
def get_document_quiz(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QuizSession:
    document = db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    quiz = get_latest_quiz(db, document_id, user.id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz_to_schema(quiz)


@router.get("/documents/{document_id}/knowledge", response_model=list[KnowledgeNode])
def get_document_knowledge(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[KnowledgeNode]:
    document = db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    nodes = db.scalars(select(KnowledgeNodeModel).where(KnowledgeNodeModel.document_id == document.id)).all()
    return [knowledge_to_schema(node) for node in nodes]


@router.get("/documents/{document_id}/mindmap", response_model=MindMapGraph)
def get_document_mindmap(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MindMapGraph:
    document = db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    graph = db.scalar(
        select(MindMapGraphModel).where(MindMapGraphModel.document_id == document.id).order_by(desc(MindMapGraphModel.created_at))
    )
    if graph is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mind map not found")
    return mindmap_to_schema(graph)


@router.get("/documents/{document_id}/download")
def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Download the original PDF file for preview."""
    document = db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    local_path = storage.get_local_file_path(document.file_key)
    if local_path.exists():
        return FileResponse(
            path=str(local_path),
            media_type="application/pdf",
            filename=document.file_name,
            content_disposition_type="inline",
        )

    try:
        content = storage.get_bytes(document.file_key)
    except FileNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF file not found on server")

    return Response(
        content=content,
        media_type="application/pdf",
        headers={"content-disposition": _inline_pdf_disposition(document.file_name)},
    )


@router.get("/knowledge/search", response_model=list[SearchResult])
def search(q: str = Query(default=""), db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[SearchResult]:
    return search_knowledge(db, user, q)


@router.post("/internal/pipeline/jobs/{job_id}/complete", response_model=DocumentSummary)
def complete_pipeline_job(
    job_id: str,
    payload: PipelineCompleteRequest,
    _: None = Depends(require_worker_token),
    db: Session = Depends(get_db),
) -> DocumentSummary:
    job = db.get(TaskJob, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    document = apply_pipeline_result(db, job, payload)
    return document_to_summary(document, job.id)
