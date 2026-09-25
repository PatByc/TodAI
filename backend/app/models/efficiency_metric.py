"""Content-free operational metrics for AI and indexing work."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class EfficiencyMetric(Base):
    __tablename__ = "efficiency_metrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    operation: Mapped[str] = mapped_column(String(40))
    started_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    duration_ms: Mapped[float] = mapped_column(Float)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cached_input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    embedding_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_requests: Mapped[int] = mapped_column(Integer, default=0)
    embedding_requests: Mapped[int] = mapped_column(Integer, default=0)
    db_queries: Mapped[int] = mapped_column(Integer, default=0)
    db_time_ms: Mapped[float] = mapped_column(Float, default=0)
    tool_calls: Mapped[int] = mapped_column(Integer, default=0)
    tool_chars_before: Mapped[int] = mapped_column(Integer, default=0)
    tool_chars_after: Mapped[int] = mapped_column(Integer, default=0)
    compression_tokens_before: Mapped[int] = mapped_column(Integer, default=0)
    compression_tokens_after: Mapped[int] = mapped_column(Integer, default=0)
    compression_failures: Mapped[int] = mapped_column(Integer, default=0)
    indexed_chunks: Mapped[int] = mapped_column(Integer, default=0)
    embeddings_created: Mapped[int] = mapped_column(Integer, default=0)
    embeddings_reused: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_efficiency_metrics_operation_started", "operation", "started_at"),
    )
