from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Document, ReviewQueueItem, TaskJob, User
from .security import hash_password
from .services.pipeline import apply_pipeline_result, build_demo_payload


def seed_demo_user(db: Session) -> None:
    admin = db.scalar(select(User).where(User.email == "admin@example.com"))
    if admin is None:
        admin = User(
            id="user-admin",
            email="admin@example.com",
            full_name="Admin",
            password_hash=hash_password("admin123"),
            is_admin=True,
        )
        db.add(admin)
        db.commit()

    existing = db.scalar(select(User).where(User.email == "demo@example.com"))
    if existing is None:
        existing = User(
            id="user-demo",
            email="demo@example.com",
            full_name="Demo User",
            password_hash=hash_password("password123"),
        )
        db.add(existing)
        db.commit()

    has_document = db.scalar(select(Document.id).where(Document.user_id == existing.id))
    if has_document:
        return

    document = Document(
        id="doc-demo-foundations",
        user_id=existing.id,
        title="AI 自学笔记平台示例.pdf",
        file_key="documents/user-demo/doc-demo-foundations/source.pdf",
        file_name="AI 自学笔记平台示例.pdf",
        file_size=248_000,
        mime_type="application/pdf",
        status="uploaded",
        progress_label="示例 PDF 已上传",
    )
    job = TaskJob(
        id="job-demo-foundations",
        document_id=document.id,
        user_id=existing.id,
        type="process_document",
        status="queued",
        payload={"document_id": document.id, "title": document.title, "storage_key": document.file_key},
    )
    db.add_all([document, job])
    db.commit()
    apply_pipeline_result(db, job, build_demo_payload(document))

    db.add(
        ReviewQueueItem(
            id="review-demo-foundations",
            user_id=existing.id,
            knowledge_node_id=f"{document.id}-kn-2",
            title="AI 自学笔记平台示例 / 关键机制",
            priority="medium",
            recommendation="用自己的话复述上传、抽取、测评和反馈四个步骤。",
        )
    )
    db.commit()
