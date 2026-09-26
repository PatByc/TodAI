"""Add durable Review reflections.

Revision ID: d0f3a5b7c912
Revises: c9e2d4f6a810
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d0f3a5b7c912"
down_revision: str | None = "c9e2d4f6a810"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "review_reflections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("scope", sa.String(length=10), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("timezone", sa.String(length=100), nullable=False),
        sa.Column("what_worked", sa.Text(), server_default="", nullable=False),
        sa.Column("friction", sa.Text(), server_default="", nullable=False),
        sa.Column("adjustment", sa.Text(), server_default="", nullable=False),
        sa.Column("patterns", sa.JSON(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "scope",
            "start_date",
            "end_date",
            "timezone",
            name="uq_review_reflection_period",
        ),
    )


def downgrade() -> None:
    op.drop_table("review_reflections")
