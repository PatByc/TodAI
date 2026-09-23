"""Store versioned MCP proposals and atomic execution results.

Revision ID: e5f7a9b1c3d5
Revises: d4e6f8a0b2c4
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e5f7a9b1c3d5"
down_revision: str | None = "d4e6f8a0b2c4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("agent_proposals") as batch:
        batch.add_column(sa.Column("schema_version", sa.Integer(), nullable=False, server_default="2"))
        batch.add_column(sa.Column("results", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("failure_reason", sa.Text(), nullable=True))
        batch.add_column(sa.Column("completed_at", sa.DateTime(), nullable=True))
    op.execute("UPDATE agent_proposals SET status = 'expired' WHERE status IN ('pending', 'applying')")


def downgrade() -> None:
    with op.batch_alter_table("agent_proposals") as batch:
        batch.drop_column("completed_at")
        batch.drop_column("failure_reason")
        batch.drop_column("results")
        batch.drop_column("schema_version")
