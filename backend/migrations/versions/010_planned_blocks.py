"""Add calendar planned blocks.

Revision ID: dae2f4a6b8c0
Revises: c9d1e3f5a7b9
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "dae2f4a6b8c0"
down_revision: str | None = "c9d1e3f5a7b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "planned_blocks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("starts_at", sa.DateTime(), nullable=False),
        sa.Column("ends_at", sa.DateTime(), nullable=False),
        sa.Column(
            "stream_id",
            sa.Integer(),
            sa.ForeignKey("time_streams.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_planned_blocks_starts_at", "planned_blocks", ["starts_at"])
    op.create_index("ix_planned_blocks_ends_at", "planned_blocks", ["ends_at"])
    op.create_index("ix_planned_blocks_stream_id", "planned_blocks", ["stream_id"])
    op.create_index("ix_planned_blocks_project_id", "planned_blocks", ["project_id"])


def downgrade() -> None:
    op.drop_table("planned_blocks")
