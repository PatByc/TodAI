"""Add routines, completions, and time goals.

Revision ID: c9d1e3f5a7b9
Revises: b8c0d2e4f6a8
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c9d1e3f5a7b9"
down_revision: str | None = "b8c0d2e4f6a8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "routines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("scheduled_time", sa.Time(), nullable=True),
        sa.Column("weekdays", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_routines_is_active", "routines", ["is_active"])
    op.create_table(
        "routine_completions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "routine_id",
            sa.Integer(),
            sa.ForeignKey("routines.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("completed_on", sa.Date(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("routine_id", "completed_on"),
    )
    op.create_index(
        "ix_routine_completions_routine_id", "routine_completions", ["routine_id"]
    )
    op.create_index(
        "ix_routine_completions_completed_on", "routine_completions", ["completed_on"]
    )
    op.create_table(
        "time_goals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column(
            "period",
            sa.Enum("daily", "weekly", "monthly", name="goalperiod"),
            nullable=False,
        ),
        sa.Column("target_seconds", sa.Integer(), nullable=False),
        sa.Column(
            "stream_id",
            sa.Integer(),
            sa.ForeignKey("time_streams.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_time_goals_stream_id", "time_goals", ["stream_id"])
    op.create_index("ix_time_goals_is_active", "time_goals", ["is_active"])


def downgrade() -> None:
    op.drop_table("time_goals")
    op.drop_table("routine_completions")
    op.drop_table("routines")
