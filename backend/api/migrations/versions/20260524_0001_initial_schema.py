"""initial schema

Revision ID: 20260524_0001
Revises:
Create Date: 2026-05-24
"""

from alembic import op
import sqlalchemy as sa


revision = "20260524_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("full_name", sa.String(length=240), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("is_admin", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "notifications",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("link", sa.String(length=768), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    op.create_table(
        "documents",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("file_key", sa.String(length=768), nullable=False),
        sa.Column("file_name", sa.String(length=512), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column("page_count", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("progress_label", sa.String(length=512), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_documents_status", "documents", ["status"])
    op.create_index("ix_documents_user_id", "documents", ["user_id"])

    op.create_table(
        "document_chunks",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("document_id", sa.String(length=64), sa.ForeignKey("documents.id"), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source_pages", sa.JSON(), nullable=False),
        sa.Column("section_path", sa.JSON(), nullable=False),
        sa.Column("embedding", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("document_id", "chunk_index", name="uq_chunk_document_index"),
    )
    op.create_index("ix_document_chunks_document_id", "document_chunks", ["document_id"])

    op.create_table(
        "knowledge_nodes",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("document_id", sa.String(length=64), sa.ForeignKey("documents.id"), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("source_pages", sa.JSON(), nullable=False),
        sa.Column("difficulty", sa.String(length=32), nullable=False),
        sa.Column("embedding", sa.JSON(), nullable=False),
        sa.Column("relations", sa.JSON(), nullable=False),
        sa.Column("chapter_title", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_knowledge_nodes_document_id", "knowledge_nodes", ["document_id"])

    op.create_table(
        "mindmap_graphs",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("document_id", sa.String(length=64), sa.ForeignKey("documents.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("nodes", sa.JSON(), nullable=False),
        sa.Column("edges", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_mindmap_graphs_document_id", "mindmap_graphs", ["document_id"])

    op.create_table(
        "quiz_sessions",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("document_id", sa.String(length=64), sa.ForeignKey("documents.id"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_quiz_sessions_document_id", "quiz_sessions", ["document_id"])
    op.create_index("ix_quiz_sessions_user_id", "quiz_sessions", ["user_id"])

    op.create_table(
        "quiz_questions",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("quiz_id", sa.String(length=64), sa.ForeignKey("quiz_sessions.id"), nullable=False),
        sa.Column("document_id", sa.String(length=64), sa.ForeignKey("documents.id"), nullable=False),
        sa.Column("knowledge_node_id", sa.String(length=64), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("stem", sa.Text(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("answer", sa.JSON(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("difficulty", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_quiz_questions_document_id", "quiz_questions", ["document_id"])
    op.create_index("ix_quiz_questions_knowledge_node_id", "quiz_questions", ["knowledge_node_id"])
    op.create_index("ix_quiz_questions_quiz_id", "quiz_questions", ["quiz_id"])

    op.create_table(
        "quiz_answers",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("attempt_id", sa.String(length=64), nullable=False),
        sa.Column("quiz_id", sa.String(length=64), sa.ForeignKey("quiz_sessions.id"), nullable=False),
        sa.Column("question_id", sa.String(length=64), sa.ForeignKey("quiz_questions.id"), nullable=False),
        sa.Column("user_answer", sa.Text(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_quiz_answers_attempt_id", "quiz_answers", ["attempt_id"])
    op.create_index("ix_quiz_answers_quiz_id", "quiz_answers", ["quiz_id"])

    op.create_table(
        "feedback_reports",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("quiz_id", sa.String(length=64), sa.ForeignKey("quiz_sessions.id"), nullable=False),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("strengths", sa.JSON(), nullable=False),
        sa.Column("weak_points", sa.JSON(), nullable=False),
        sa.Column("next_review", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_feedback_reports_quiz_id", "feedback_reports", ["quiz_id"])
    op.create_index("ix_feedback_reports_user_id", "feedback_reports", ["user_id"])

    op.create_table(
        "review_queue_items",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("knowledge_node_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("priority", sa.String(length=32), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_review_queue_items_knowledge_node_id", "review_queue_items", ["knowledge_node_id"])
    op.create_index("ix_review_queue_items_user_id", "review_queue_items", ["user_id"])

    op.create_table(
        "task_jobs",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("document_id", sa.String(length=64), sa.ForeignKey("documents.id"), nullable=False),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_task_jobs_document_id", "task_jobs", ["document_id"])
    op.create_index("ix_task_jobs_user_id", "task_jobs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_task_jobs_user_id", table_name="task_jobs")
    op.drop_index("ix_task_jobs_document_id", table_name="task_jobs")
    op.drop_table("task_jobs")
    op.drop_index("ix_review_queue_items_user_id", table_name="review_queue_items")
    op.drop_index("ix_review_queue_items_knowledge_node_id", table_name="review_queue_items")
    op.drop_table("review_queue_items")
    op.drop_index("ix_feedback_reports_user_id", table_name="feedback_reports")
    op.drop_index("ix_feedback_reports_quiz_id", table_name="feedback_reports")
    op.drop_table("feedback_reports")
    op.drop_index("ix_quiz_answers_quiz_id", table_name="quiz_answers")
    op.drop_index("ix_quiz_answers_attempt_id", table_name="quiz_answers")
    op.drop_table("quiz_answers")
    op.drop_index("ix_quiz_questions_quiz_id", table_name="quiz_questions")
    op.drop_index("ix_quiz_questions_knowledge_node_id", table_name="quiz_questions")
    op.drop_index("ix_quiz_questions_document_id", table_name="quiz_questions")
    op.drop_table("quiz_questions")
    op.drop_index("ix_quiz_sessions_user_id", table_name="quiz_sessions")
    op.drop_index("ix_quiz_sessions_document_id", table_name="quiz_sessions")
    op.drop_table("quiz_sessions")
    op.drop_index("ix_mindmap_graphs_document_id", table_name="mindmap_graphs")
    op.drop_table("mindmap_graphs")
    op.drop_index("ix_knowledge_nodes_document_id", table_name="knowledge_nodes")
    op.drop_table("knowledge_nodes")
    op.drop_index("ix_document_chunks_document_id", table_name="document_chunks")
    op.drop_table("document_chunks")
    op.drop_index("ix_documents_user_id", table_name="documents")
    op.drop_index("ix_documents_status", table_name="documents")
    op.drop_table("documents")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
