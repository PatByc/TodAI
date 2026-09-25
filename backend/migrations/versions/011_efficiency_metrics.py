"""Add content-free efficiency metrics.

Revision ID: ebf3a5c7d9e1
Revises: dae2f4a6b8c0
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "ebf3a5c7d9e1"
down_revision: str | None = "dae2f4a6b8c0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "efficiency_metrics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("operation", sa.String(40), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("duration_ms", sa.Float(), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("error_type", sa.String(100), nullable=True),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "cached_input_tokens", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("embedding_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "completion_requests", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "embedding_requests", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("db_queries", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("db_time_ms", sa.Float(), nullable=False, server_default="0"),
        sa.Column("tool_calls", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "tool_chars_before", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("tool_chars_after", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "compression_tokens_before",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "compression_tokens_after", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "compression_failures", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("indexed_chunks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "embeddings_created", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "embeddings_reused", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_efficiency_metrics_started_at", "efficiency_metrics", ["started_at"]
    )
    op.create_index(
        "idx_efficiency_metrics_operation_started",
        "efficiency_metrics",
        ["operation", "started_at"],
    )


def downgrade() -> None:
    op.drop_table("efficiency_metrics")
