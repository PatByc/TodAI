"""Add native task recurrence metadata.

Revision ID: b8f1c3d5e709
Revises: a7d4e2c9f103
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b8f1c3d5e709"
down_revision: str | None = "a7d4e2c9f103"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("tasks") as batch:
        batch.add_column(sa.Column("recurrence_unit", sa.String(10), nullable=True))
        batch.add_column(
            sa.Column(
                "recurrence_interval", sa.Integer(), nullable=False, server_default="1"
            )
        )
        batch.add_column(sa.Column("recurrence_end_date", sa.Date(), nullable=True))
        batch.add_column(sa.Column("recurrence_limit", sa.Integer(), nullable=True))
        batch.add_column(
            sa.Column(
                "recurrence_occurrence",
                sa.Integer(),
                nullable=False,
                server_default="1",
            )
        )
        batch.add_column(sa.Column("recurrence_anchor", sa.DateTime(), nullable=True))
        batch.add_column(sa.Column("recurrence_source_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_tasks_recurrence_source_id_tasks",
            "tasks",
            ["recurrence_source_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch.create_unique_constraint(
            "uq_tasks_recurrence_source_id", ["recurrence_source_id"]
        )


def downgrade() -> None:
    with op.batch_alter_table("tasks") as batch:
        batch.drop_constraint("uq_tasks_recurrence_source_id", type_="unique")
        batch.drop_constraint("fk_tasks_recurrence_source_id_tasks", type_="foreignkey")
        batch.drop_column("recurrence_source_id")
        batch.drop_column("recurrence_anchor")
        batch.drop_column("recurrence_occurrence")
        batch.drop_column("recurrence_limit")
        batch.drop_column("recurrence_end_date")
        batch.drop_column("recurrence_interval")
        batch.drop_column("recurrence_unit")
