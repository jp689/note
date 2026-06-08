from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from .database import Base


def now_utc() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(240))
    password_hash: Mapped[str] = mapped_column(String(512))
    is_admin: Mapped[bool] = mapped_column(default=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    documents: Mapped[list["Document"]] = relationship(back_populates="user")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(512))
    file_key: Mapped[str] = mapped_column(String(768))
    file_name: Mapped[str] = mapped_column(String(512))
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    mime_type: Mapped[str] = mapped_column(String(128), default="application/pdf")
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), index=True, default="uploaded")
    progress_label: Mapped[str] = mapped_column(String(512), default="File uploaded and waiting for processing")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    user: Mapped[User] = relationship(back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]] = relationship(cascade="all, delete-orphan")
    knowledge_nodes: Mapped[list["KnowledgeNode"]] = relationship(cascade="all, delete-orphan")
    quizzes: Mapped[list["QuizSession"]] = relationship(cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    __table_args__ = (UniqueConstraint("document_id", "chunk_index", name="uq_chunk_document_index"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    source_pages: Mapped[list[int]] = mapped_column(JSON, default=list)
    section_path: Mapped[list[str]] = mapped_column(JSON, default=list)
    embedding: Mapped[list[float]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class KnowledgeNode(Base):
    __tablename__ = "knowledge_nodes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    title: Mapped[str] = mapped_column(String(512))
    summary: Mapped[str] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    source_pages: Mapped[list[int]] = mapped_column(JSON, default=list)
    difficulty: Mapped[str] = mapped_column(String(32), default="basic")
    embedding: Mapped[list[float]] = mapped_column(JSON, default=list)
    relations: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    chapter_title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class MindMapGraph(Base):
    __tablename__ = "mindmap_graphs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    nodes: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    edges: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="generated")
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    questions: Mapped[list["QuizQuestion"]] = relationship(cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    quiz_id: Mapped[str] = mapped_column(ForeignKey("quiz_sessions.id"), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    knowledge_node_id: Mapped[str] = mapped_column(String(64), index=True)
    type: Mapped[str] = mapped_column(String(32))
    stem: Mapped[str] = mapped_column(Text)
    options: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    answer: Mapped[str | list[str]] = mapped_column(JSON)
    explanation: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[str] = mapped_column(String(32), default="basic")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    attempt_id: Mapped[str] = mapped_column(String(64), index=True)
    quiz_id: Mapped[str] = mapped_column(ForeignKey("quiz_sessions.id"), index=True)
    question_id: Mapped[str] = mapped_column(ForeignKey("quiz_questions.id"))
    user_answer: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool | None] = mapped_column(nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class FeedbackReport(Base):
    __tablename__ = "feedback_reports"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    quiz_id: Mapped[str] = mapped_column(ForeignKey("quiz_sessions.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    score: Mapped[int] = mapped_column(Integer)
    strengths: Mapped[list[str]] = mapped_column(JSON, default=list)
    weak_points: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    next_review: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class ReviewQueueItem(Base):
    __tablename__ = "review_queue_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    knowledge_node_id: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(512))
    priority: Mapped[str] = mapped_column(String(32), default="medium")
    recommendation: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class TaskJob(Base):
    __tablename__ = "task_jobs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(64), default="process_document")
    status: Mapped[str] = mapped_column(String(32), default="queued")
    payload: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(32))  # info, success, warning, review_reminder
    title: Mapped[str] = mapped_column(String(512))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(default=False)
    link: Mapped[str | None] = mapped_column(String(768), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
