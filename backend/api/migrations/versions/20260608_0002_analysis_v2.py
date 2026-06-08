"""add analysis v2 metadata

Revision ID: 20260608_0002
Revises: 20260524_0001
Create Date: 2026-06-08
"""

from alembic import op
import sqlalchemy as sa


revision = "20260608_0002"
down_revision = "20260524_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("analysis_version", sa.Integer(), server_default="1", nullable=False))
    op.add_column("knowledge_nodes", sa.Column("details", sa.JSON(), server_default=sa.text("'{}'"), nullable=False))


def downgrade() -> None:
    op.drop_column("knowledge_nodes", "details")
    op.drop_column("documents", "analysis_version")
