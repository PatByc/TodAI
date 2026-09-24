"""Add configurable time streams and categories.

Revision ID: a7b9c1d3e5f7
Revises: f6a8b0c2d4e6
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a7b9c1d3e5f7"
down_revision: str | None = "f6a8b0c2d4e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "time_streams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("color_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "time_categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "stream_id",
            sa.Integer(),
            sa.ForeignKey("time_streams.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("stream_id", "name"),
    )
    op.create_index("ix_time_categories_stream_id", "time_categories", ["stream_id"])

    op.execute(
        "INSERT INTO time_streams (name, color_index, is_active, sort_order) "
        "VALUES ('Work', 3, true, 1), ('Personal', 7, true, 2)"
    )
    op.execute(
        "INSERT INTO time_categories "
        "(stream_id, name, color_index, is_active, sort_order) "
        "SELECT id, 'General', color_index, true, 1 FROM time_streams"
    )


def downgrade() -> None:
    op.drop_index("ix_time_categories_stream_id", table_name="time_categories")
    op.drop_table("time_categories")
    op.drop_table("time_streams")
