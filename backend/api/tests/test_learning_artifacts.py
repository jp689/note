from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace


def test_knowledge_to_schema_exposes_rich_learning_fields() -> None:
    from app.services.pipeline import knowledge_to_schema

    schema = knowledge_to_schema(
        SimpleNamespace(
            id="kn-1",
            document_id="doc-1",
            title="梯度下降",
            summary="解释参数如何沿负梯度方向更新。",
            tags=["优化"],
            source_pages=[2, 3],
            difficulty="intermediate",
            embedding=[],
            chapter_title="优化基础",
            details={
                "key_takeaways": ["学习率决定步长", "损失面形状影响收敛"],
                "examples": ["线性回归参数更新"],
                "pitfalls": ["学习率过大导致震荡"],
                "review_prompt": "用自己的话解释一次参数更新。",
                "confidence": 0.86,
            },
            relations=[
                {
                    "target_id": "kn-2",
                    "label": "supports",
                    "reason": "反向传播提供梯度来源",
                    "strength": 0.72,
                }
            ],
        )
    )

    payload = schema.model_dump(by_alias=True)

    assert payload["chapterTitle"] == "优化基础"
    assert payload["keyTakeaways"] == ["学习率决定步长", "损失面形状影响收敛"]
    assert payload["examples"] == ["线性回归参数更新"]
    assert payload["pitfalls"] == ["学习率过大导致震荡"]
    assert payload["reviewPrompt"] == "用自己的话解释一次参数更新。"
    assert payload["confidence"] == 0.86
    assert payload["relations"][0]["reason"] == "反向传播提供梯度来源"
    assert payload["relations"][0]["strength"] == 0.72


def test_mindmap_to_schema_preserves_enhanced_graph_metadata() -> None:
    from app.services.pipeline import mindmap_to_schema

    schema = mindmap_to_schema(
        SimpleNamespace(
            document_id="doc-1",
            nodes=[
                {
                    "id": "root",
                    "label": "课程笔记",
                    "group": "root",
                    "summary": "整份文档",
                    "source_pages": [1],
                    "level": 0,
                },
                {
                    "id": "kn-1",
                    "label": "梯度下降",
                    "group": "concept",
                    "knowledge_node_id": "kn-1",
                    "summary": "核心优化方法",
                    "source_pages": [2, 3],
                    "level": 2,
                },
            ],
            edges=[
                {
                    "source": "root",
                    "target": "kn-1",
                    "label": "包含",
                    "relation_type": "contains",
                    "strength": 0.9,
                }
            ],
        )
    )

    payload = schema.model_dump(by_alias=True)

    assert payload["nodes"][1]["knowledgeNodeId"] == "kn-1"
    assert payload["nodes"][1]["sourcePages"] == [2, 3]
    assert payload["nodes"][1]["level"] == 2
    assert payload["edges"][0]["relationType"] == "contains"
    assert payload["edges"][0]["strength"] == 0.9


def test_enqueue_outdated_documents_is_idempotent(monkeypatch) -> None:
    from app import models
    from app.database import Base
    from app.reprocess import enqueue_outdated_documents
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    queued_payloads: list[dict[str, object]] = []

    def enqueue(payload: dict[str, object]) -> bool:
        queued_payloads.append(payload)
        return True

    with Session(engine) as db:
        user = models.User(
            id="user-1",
            email="demo@example.com",
            full_name="Demo",
            password_hash="hash",
        )
        db.add(user)
        db.add(
            models.Document(
                id="doc-old",
                user_id=user.id,
                title="old.pdf",
                file_key="documents/user-1/doc-old/old.pdf",
                file_name="old.pdf",
                file_size=100,
                mime_type="application/pdf",
                page_count=1,
                status="quiz_ready",
                progress_label="Ready",
                analysis_version=1,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
        )
        db.commit()

        assert enqueue_outdated_documents(db, enqueue=enqueue) == 1
        assert enqueue_outdated_documents(db, enqueue=enqueue) == 0

        assert len(queued_payloads) == 1
        assert queued_payloads[0]["document_id"] == "doc-old"


def test_enqueue_outdated_documents_ignores_completed_process_jobs(monkeypatch) -> None:
    from app import models
    from app.database import Base
    from app.reprocess import enqueue_outdated_documents
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    queued_payloads: list[dict[str, object]] = []

    def enqueue(payload: dict[str, object]) -> bool:
        queued_payloads.append(payload)
        return True

    with Session(engine) as db:
        user = models.User(
            id="user-1",
            email="demo@example.com",
            full_name="Demo",
            password_hash="hash",
        )
        db.add(user)
        for document_id in ("doc-completed-old-job", "doc-active-old-job"):
            db.add(
                models.Document(
                    id=document_id,
                    user_id=user.id,
                    title=f"{document_id}.pdf",
                    file_key=f"documents/user-1/{document_id}/source.pdf",
                    file_name=f"{document_id}.pdf",
                    file_size=100,
                    mime_type="application/pdf",
                    page_count=1,
                    status="quiz_ready",
                    progress_label="Ready",
                    analysis_version=1,
                    created_at=datetime.now(UTC),
                    updated_at=datetime.now(UTC),
                )
            )
        db.add(
            models.TaskJob(
                id="job-completed-old",
                document_id="doc-completed-old-job",
                user_id=user.id,
                type="process_document",
                status="completed",
                payload={},
            )
        )
        db.add(
            models.TaskJob(
                id="job-active-old",
                document_id="doc-active-old-job",
                user_id=user.id,
                type="process_document",
                status="processing",
                payload={},
            )
        )
        db.commit()

        assert enqueue_outdated_documents(db, enqueue=enqueue) == 1
        assert queued_payloads[0]["document_id"] == "doc-completed-old-job"
