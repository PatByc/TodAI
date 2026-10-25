"""Add Evening routine classification, settings, and reflections.

Revision ID: a8d3f6c2e941
Revises: c4e8a2f1b730
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a8d3f6c2e941"
down_revision: str | None = "c4e8a2f1b730"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("routines") as batch:
        batch.add_column(
            sa.Column("is_evening", sa.Boolean(), nullable=False, server_default="0")
        )
        batch.add_column(sa.Column("evening_position", sa.Integer(), nullable=True))
        batch.create_index("ix_routines_is_evening", ["is_evening"])
    op.create_table(
        "evening_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )
    op.execute(
        "INSERT INTO evening_settings (id, start_time, end_time) VALUES (1, '20:00:00', '23:59:00')"
    )
    op.create_table(
        "evening_reflections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reflected_on", sa.Date(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("journal", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("reflected_on"),
    )
    op.create_index(
        "ix_evening_reflections_reflected_on", "evening_reflections", ["reflected_on"]
    )


def downgrade() -> None:
    op.drop_index(
        "ix_evening_reflections_reflected_on", table_name="evening_reflections"
    )
    op.drop_table("evening_reflections")
    op.drop_table("evening_settings")
    with op.batch_alter_table("routines") as batch:
        batch.drop_index("ix_routines_is_evening")
        batch.drop_column("evening_position")
        batch.drop_column("is_evening")
