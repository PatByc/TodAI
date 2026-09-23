"""Human-reviewed Agent actions waiting for approval."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class AgentProposal(Base):
    __tablename__ = "agent_proposals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    question: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text)
    actions: Mapped[list[dict]] = mapped_column(JSON)
    schema_version: Mapped[int] = mapped_column(Integer, default=2)
    results: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
