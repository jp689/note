from __future__ import annotations

from uuid import uuid4

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .models import Document, TaskJob
from .queueing import enqueue_document_job

TARGET_ANALYSIS_VERSION = 2
REPROCESSABLE_STATUSES = ("uploaded", "parsing", "structured", "quiz_ready", "failed")


def _job_payload(document: Document, job: TaskJob) -> dict[str, object]:
    return {
        "job_id": job.id,
        "document_id": document.id,
        "user_id": document.user_id,
        "title": document.title,
        "storage_key": document.file_key,
        "source_type": "pdf",
    }


def enqueue_outdated_documents(
    db: Session,
    enqueue=enqueue_document_job,
    target_version: int = TARGET_ANALYSIS_VERSION,
) -> int:
    documents = db.scalars(
        select(Document).where(
            Document.analysis_version < target_version,
            Document.file_size > 0,
            Document.status.in_(REPROCESSABLE_STATUSES),
        )
    ).all()
    queued = 0
    for document in documents:
        existing = db.scalar(
            select(TaskJob.id).where(
                TaskJob.document_id == document.id,
                or_(
                    (
                        (TaskJob.type == "process_document")
                        & TaskJob.status.in_(("queued", "processing"))
                    ),
                    (
                        (TaskJob.type == "reprocess_document_v2")
                        & TaskJob.status.in_(("queued", "processing", "completed"))
                    ),
                ),
            )
        )
        if existing:
            continue
        job = TaskJob(
            id=f"job-{uuid4().hex[:12]}",
            document_id=document.id,
            user_id=document.user_id,
            type="reprocess_document_v2",
            status="queued",
            payload={},
        )
        job.payload = _job_payload(document, job)
        db.add(job)
        enqueue(job.payload)
        queued += 1
    db.commit()
    return queued
