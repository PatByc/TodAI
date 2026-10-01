"""Add workspace profile and onboarding state.

Revision ID: a13f7c9d2e41
Revises: e1a4b6c8d023
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a13f7c9d2e41"
down_revision: str | None = "e1a4b6c8d023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workspace_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("display_name", sa.String(length=80), nullable=True),
        sa.Column("onboarding_version", sa.Integer(), nullable=True),
        sa.Column("onboarding_outcome", sa.String(length=20), nullable=True),
        sa.Column(
            "starter_project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "starter_task_id",
            sa.Integer(),
            sa.ForeignKey("tasks.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("skipped_at", sa.DateTime(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("workspace_profiles")
