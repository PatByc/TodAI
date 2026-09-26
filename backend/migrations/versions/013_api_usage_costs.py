"""Add durable cloud API request cost records.

Revision ID: a7d4e2c9f103
Revises: fc04b6e8a2d3
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a7d4e2c9f103"
down_revision: str | None = "fc04b6e8a2d3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "api_usage_costs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("operation", sa.String(40), nullable=False),
        sa.Column("provider", sa.String(40), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("request_kind", sa.String(30), nullable=False),
        sa.Column("provider_request_id", sa.String(200), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "cached_input_tokens", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "input_price_per_million_usd", sa.Numeric(14, 6), nullable=True
        ),
        sa.Column(
            "cached_input_price_per_million_usd", sa.Numeric(14, 6), nullable=True
        ),
        sa.Column(
            "output_price_per_million_usd", sa.Numeric(14, 6), nullable=True
        ),
        sa.Column("estimated_cost_usd", sa.Numeric(18, 10), nullable=True),
        sa.Column("pricing_status", sa.String(30), nullable=False),
        sa.Column("pricing_version", sa.String(30), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_api_usage_costs_occurred_at", "api_usage_costs", ["occurred_at"]
    )
    op.create_index(
        "idx_api_usage_costs_provider_model",
        "api_usage_costs",
        ["provider", "model"],
    )
    op.create_index(
        "idx_api_usage_costs_operation_occurred",
        "api_usage_costs",
        ["operation", "occurred_at"],
    )


def downgrade() -> None:
    op.drop_table("api_usage_costs")
