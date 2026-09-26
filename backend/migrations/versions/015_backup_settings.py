"""Add automatic SQLite backup settings.

Revision ID: c9e2d4f6a810
Revises: b8f1c3d5e709
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c9e2d4f6a810"
down_revision: str | None = "b8f1c3d5e709"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "backup_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "frequency", sa.String(length=10), server_default="off", nullable=False
        ),
        sa.Column(
            "retention_count", sa.Integer(), server_default="3", nullable=False
        ),
        sa.Column("last_backup_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("backup_settings")
