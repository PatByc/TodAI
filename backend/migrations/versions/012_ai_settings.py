"""Add persisted AI Agent settings.

Revision ID: fc04b6e8a2d3
Revises: ebf3a5c7d9e1
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "fc04b6e8a2d3"
down_revision: str | None = "ebf3a5c7d9e1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "context_compression_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("ai_settings")
