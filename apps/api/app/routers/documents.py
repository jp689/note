from fastapi import APIRouter, HTTPException, Query, Request, status

from ..config import settings
from ..schemas import (
    DocumentProcessResponse,
    DocumentSummary,
    KnowledgeNode,
    MindMapGraph,
    SearchResult,
    QuizSession,
    UploadContentResponse,
    UploadDocumentRequest,
    UploadDocumentResponse,
)
from ..services.pipeline import process_document
from ..store import store

router = APIRouter(prefix="/api", tags=["documents"])


@router.post("/documents/upload", response_model=UploadDocumentResponse)
def upload_document(payload: UploadDocumentRequest) -> UploadDocumentResponse:
    if payload.content_type != "application/pdf" or not payload.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF uploads are supported",
        )
    if payload.size_bytes <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file must not be empty",
        )

    document = store.create_document(payload.filename)
    upload_url = f"/api/documents/{document.id}/content"
    return UploadDocumentResponse(document=document, upload_url=upload_url)


@router.get("/documents", response_model=list[DocumentSummary])
def list_documents() -> list[DocumentSummary]:
    return store.list_documents()


@router.put("/documents/{document_id}/content", response_model=UploadContentResponse)
async def upload_document_content(document_id: str, request: Request) -> UploadContentResponse:
    document = store.get_document(document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    content = await request.body()
    content_type = request.headers.get("content-type", "")
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file must not be empty",
        )
    if "application/pdf" not in content_type and not content.startswith(b"%PDF"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF uploads are supported",
        )

    document.status = "uploaded"
    document.progress_label = "PDF received and ready for processing"
    store.set_document(document)
    return UploadContentResponse(document=document, received_bytes=len(content))


@router.post("/documents/{document_id}/process", response_model=DocumentProcessResponse)
def trigger_document_processing(document_id: str) -> DocumentProcessResponse:
    document = store.get_document(document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if settings.process_inline:
        processed = process_document(store, document_id)
        return DocumentProcessResponse(
            document_id=document_id,
            status=processed.status,
            queued=False,
            message="Document processed inline for the current scaffold.",
        )

    document.status = "parsing"
    document.progress_label = "已加入处理队列，等待 worker 执行"
    store.set_document(document)
    return DocumentProcessResponse(
        document_id=document_id,
        status=document.status,
        queued=True,
        message="Document queued for worker processing.",
    )


@router.get("/documents/{document_id}/status", response_model=DocumentSummary)
def get_document_status(document_id: str) -> DocumentSummary:
    document = store.get_document(document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.get("/documents/{document_id}/quiz", response_model=QuizSession)
def get_document_quiz(document_id: str) -> QuizSession:
    document = store.get_document(document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    quiz = store.get_latest_quiz_for_document(document_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


@router.get("/documents/{document_id}/knowledge", response_model=list[KnowledgeNode])
def get_document_knowledge(document_id: str) -> list[KnowledgeNode]:
    document = store.get_document(document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return store.get_knowledge(document_id)


@router.get("/documents/{document_id}/mindmap", response_model=MindMapGraph)
def get_document_mindmap(document_id: str) -> MindMapGraph:
    graph = store.get_mindmap(document_id)
    if graph is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mind map not found")
    return graph


@router.get("/knowledge/search", response_model=list[SearchResult])
def search_knowledge(q: str = Query(default="")) -> list[SearchResult]:
    return store.search_knowledge(q)
