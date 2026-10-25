"""Add 12 Week Year framework.

Revision ID: f2b5c7d9e134
Revises: a13f7c9d2e41
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f2b5c7d9e134"
down_revision: str | None = "a13f7c9d2e41"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    with op.batch_alter_table("planned_blocks") as batch:
        batch.add_column(
            sa.Column(
                "block_kind", sa.String(20), nullable=False, server_default="standard"
            )
        )
    op.create_table(
        "twelve_week_cycles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("timezone", sa.String(100), nullable=False),
        sa.Column("workbook_version", sa.Integer(), nullable=False),
        sa.Column("workbook_answers", sa.JSON(), nullable=False),
        sa.Column("activated_at", sa.DateTime(), nullable=True),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_twelve_week_cycles_status", "twelve_week_cycles", ["status"])
    op.create_table(
        "twelve_week_goals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "cycle_id",
            sa.Integer(),
            sa.ForeignKey("twelve_week_cycles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("success_criteria", sa.Text(), nullable=False),
        sa.Column("mind_map", sa.JSON(), nullable=False),
        sa.Column(
            "linked_time_goal_id",
            sa.Integer(),
            sa.ForeignKey("time_goals.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "linked_metric_goal_id",
            sa.Integer(),
            sa.ForeignKey("metric_goals.id", ondelete="SET NULL"),
            nullable=True,
        ),
        *timestamps(),
        sa.UniqueConstraint("cycle_id", "position"),
    )
    op.create_index("ix_twelve_week_goals_cycle_id", "twelve_week_goals", ["cycle_id"])
    op.create_table(
        "twelve_week_tactics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "goal_id",
            sa.Integer(),
            sa.ForeignKey("twelve_week_goals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("due_weeks", sa.JSON(), nullable=False),
        sa.Column("rule_kind", sa.String(30), nullable=False),
        sa.Column("rule_config", sa.JSON(), nullable=False),
        *timestamps(),
    )
    op.create_index(
        "ix_twelve_week_tactics_goal_id", "twelve_week_tactics", ["goal_id"]
    )
    op.create_table(
        "twelve_week_weeks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "cycle_id",
            sa.Integer(),
            sa.ForeignKey("twelve_week_cycles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("review", sa.JSON(), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("finalized_at", sa.DateTime(), nullable=True),
        *timestamps(),
        sa.UniqueConstraint("cycle_id", "week_number"),
    )
    op.create_index("ix_twelve_week_weeks_cycle_id", "twelve_week_weeks", ["cycle_id"])
    op.create_table(
        "twelve_week_occurrences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "tactic_id",
            sa.Integer(),
            sa.ForeignKey("twelve_week_tactics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "week_id",
            sa.Integer(),
            sa.ForeignKey("twelve_week_weeks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("manual_completed", sa.Boolean(), nullable=True),
        sa.Column("manual_note", sa.Text(), nullable=False),
        sa.Column(
            "linked_task_id",
            sa.Integer(),
            sa.ForeignKey("tasks.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("snapshot_completed", sa.Boolean(), nullable=True),
        sa.Column("snapshot_evidence", sa.JSON(), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("tactic_id", "week_id"),
    )
    op.create_index(
        "ix_twelve_week_occurrences_tactic_id", "twelve_week_occurrences", ["tactic_id"]
    )
    op.create_index(
        "ix_twelve_week_occurrences_week_id", "twelve_week_occurrences", ["week_id"]
    )
    op.create_table(
        "twelve_week_model_blocks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "cycle_id",
            sa.Integer(),
            sa.ForeignKey("twelve_week_cycles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("starts_at", sa.Time(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        *timestamps(),
    )
    op.create_index(
        "ix_twelve_week_model_blocks_cycle_id", "twelve_week_model_blocks", ["cycle_id"]
    )
    op.create_table(
        "twelve_week_block_instances",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "template_id",
            sa.Integer(),
            sa.ForeignKey("twelve_week_model_blocks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column(
            "planned_block_id",
            sa.Integer(),
            sa.ForeignKey("planned_blocks.id", ondelete="SET NULL"),
            nullable=True,
        ),
        *timestamps(),
        sa.UniqueConstraint("template_id", "week_number"),
    )
    op.create_index(
        "ix_twelve_week_block_instances_template_id",
        "twelve_week_block_instances",
        ["template_id"],
    )


def downgrade() -> None:
    for table in [
        "twelve_week_block_instances",
        "twelve_week_model_blocks",
        "twelve_week_occurrences",
        "twelve_week_weeks",
        "twelve_week_tactics",
        "twelve_week_goals",
        "twelve_week_cycles",
    ]:
        op.drop_table(table)
    with op.batch_alter_table("planned_blocks") as batch:
        batch.drop_column("block_kind")
