"""Add persisted task progress.

Revision ID: f6a8b0c2d4e6
Revises: e5f7a9b1c3d5
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f6a8b0c2d4e6"
down_revision: str | None = "e5f7a9b1c3d5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("tasks") as batch:
        batch.add_column(
            sa.Column("progress", sa.Integer(), nullable=False, server_default="0")
        )
    op.execute("UPDATE tasks SET progress = 100 WHERE status = 'DONE'")


def downgrade() -> None:
    with op.batch_alter_table("tasks") as batch:
        batch.drop_column("progress")
