"""Audit log model for tracking entity changes."""

from datetime import datetime

from sqlalchemy import JSON, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class AuditLog(Base):
    """Application-level audit log for entity mutations."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(20))
    entity_id: Mapped[int] = mapped_column(Integer)
    action: Mapped[str] = mapped_column(String(20))
    changes: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (Index("idx_audit_entity", "entity_type", "entity_id"),)
