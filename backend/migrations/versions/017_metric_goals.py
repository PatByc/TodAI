"""Add metric goals and progress entries.

Revision ID: e1a4b6c8d023
Revises: d0f3a5b7c912
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e1a4b6c8d023"
down_revision: str | None = "d0f3a5b7c912"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    period_type = (
        postgresql.ENUM(
            "daily", "weekly", "monthly", name="goalperiod", create_type=False
        )
        if op.get_bind().dialect.name == "postgresql"
        else sa.Enum("daily", "weekly", "monthly", name="goalperiod")
    )
    op.create_table(
        "metric_goals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column(
            "period",
            period_type,
            nullable=False,
        ),
        sa.Column("target_value", sa.Float(), nullable=False),
        sa.Column(
            "direction",
            sa.Enum("at_least", "at_most", name="metricgoaldirection"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_metric_goals_is_active"),
        "metric_goals",
        ["is_active"],
        unique=False,
    )
    op.create_table(
        "metric_goal_progress",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column("recorded_on", sa.Date(), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["goal_id"], ["metric_goals.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_metric_goal_progress_goal_id"),
        "metric_goal_progress",
        ["goal_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_metric_goal_progress_recorded_on"),
        "metric_goal_progress",
        ["recorded_on"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_metric_goal_progress_recorded_on"),
        table_name="metric_goal_progress",
    )
    op.drop_index(
        op.f("ix_metric_goal_progress_goal_id"), table_name="metric_goal_progress"
    )
    op.drop_table("metric_goal_progress")
    op.drop_index(op.f("ix_metric_goals_is_active"), table_name="metric_goals")
    op.drop_table("metric_goals")
    if op.get_bind().dialect.name == "postgresql":
        postgresql.ENUM(name="metricgoaldirection").drop(
            op.get_bind(), checkfirst=True
        )
