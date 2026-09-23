"""reviewable Agent proposals

Revision ID: d4e6f8a0b2c4
Revises: c3d5e7f9a1b3
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e6f8a0b2c4"
down_revision: Union[str, Sequence[str], None] = "c3d5e7f9a1b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_proposals",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("actions", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_agent_proposals_status", "agent_proposals", ["status", "expires_at"])


def downgrade() -> None:
    op.drop_index("idx_agent_proposals_status", table_name="agent_proposals")
    op.drop_table("agent_proposals")
