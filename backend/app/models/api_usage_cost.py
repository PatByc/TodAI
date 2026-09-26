"""Durable, content-free cost records for cloud AI API requests."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Index, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class APIUsageCost(Base):
    """One billable provider response with the rate snapshot used to estimate it."""

    __tablename__ = "api_usage_costs"

    id: Mapped[int] = mapped_column(primary_key=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    operation: Mapped[str] = mapped_column(String(40))
    provider: Mapped[str] = mapped_column(String(40))
    model: Mapped[str] = mapped_column(String(100))
    request_kind: Mapped[str] = mapped_column(String(30))
    provider_request_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cached_input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    input_price_per_million_usd: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 6), nullable=True
    )
    cached_input_price_per_million_usd: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 6), nullable=True
    )
    output_price_per_million_usd: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 6), nullable=True
    )
    estimated_cost_usd: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 10), nullable=True
    )
    pricing_status: Mapped[str] = mapped_column(String(30))
    pricing_version: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_api_usage_costs_provider_model", "provider", "model"),
        Index("idx_api_usage_costs_operation_occurred", "operation", "occurred_at"),
    )
