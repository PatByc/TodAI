"""Add Morning routine classification and settings.

Revision ID: c4e8a2f1b730
Revises: f2b5c7d9e134
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c4e8a2f1b730"
down_revision: str | None = "f2b5c7d9e134"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("routines") as batch:
        batch.add_column(
            sa.Column("is_morning", sa.Boolean(), nullable=False, server_default="0")
        )
        batch.add_column(sa.Column("morning_position", sa.Integer(), nullable=True))
        batch.create_index("ix_routines_is_morning", ["is_morning"])
    op.create_table(
        "morning_settings",
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
        "INSERT INTO morning_settings (id, start_time, end_time) VALUES (1, '06:00:00', '09:00:00')"
    )


def downgrade() -> None:
    op.drop_table("morning_settings")
    with op.batch_alter_table("routines") as batch:
        batch.drop_index("ix_routines_is_morning")
        batch.drop_column("morning_position")
        batch.drop_column("is_morning")
