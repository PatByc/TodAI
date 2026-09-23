"""projects and inbox items

Revision ID: a2c4e6f8b0d2
Revises: fba851d3ada8
Create Date: 2026-09-15 14:38:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a2c4e6f8b0d2"
down_revision: Union[str, Sequence[str], None] = "fba851d3ada8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create projects and inbox_items tables, add project_id FK to entity tables."""
    json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")

    # Create projects table
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=500), nullable=False),
        sa.Column("description", json_type, nullable=True),
        sa.Column("description_text", sa.Text(), nullable=True),
        sa.Column("goals", sa.Text(), nullable=True),
        sa.Column("current_focus", sa.String(length=500), nullable=True),
        sa.Column(
            "status",
            sa.Enum("ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED", name="projectstatus"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create inbox_items table
    op.create_table(
        "inbox_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("content", json_type, nullable=False),
        sa.Column("content_text", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Add project_id FK column to notes, tasks, and ideas
    for table_name in ("notes", "tasks", "ideas"):
        with op.batch_alter_table(table_name) as batch_op:
            batch_op.add_column(sa.Column("project_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                f"fk_{table_name}_project_id",
                "projects",
                ["project_id"],
                ["id"],
                ondelete="SET NULL",
            )
            batch_op.create_index(f"idx_{table_name}_project_id", ["project_id"])


def downgrade() -> None:
    """Drop project_id FK columns and new tables."""
    for table_name in ("ideas", "tasks", "notes"):
        with op.batch_alter_table(table_name) as batch_op:
            batch_op.drop_index(f"idx_{table_name}_project_id")
            batch_op.drop_constraint(f"fk_{table_name}_project_id", type_="foreignkey")
            batch_op.drop_column("project_id")

    # Drop tables
    op.drop_table("inbox_items")
    op.drop_table("projects")

    # PostgreSQL creates a named enum type outside the projects table.
    if op.get_bind().dialect.name == "postgresql":
        sa.Enum(name="projectstatus").drop(op.get_bind(), checkfirst=True)
