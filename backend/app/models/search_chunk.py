"""Derived, rebuildable search chunk model."""

from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class SearchChunk(Base):
    """Searchable slice of an authoritative TodAI entity."""

    __tablename__ = "search_chunks"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(20))
    entity_id: Mapped[int] = mapped_column(Integer)
    chunk_index: Mapped[int] = mapped_column(Integer)
    section: Mapped[str] = mapped_column(String(100), default="body")
    title: Mapped[str] = mapped_column(String(500), default="")
    content: Mapped[str] = mapped_column(Text)
    project_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    content_hash: Mapped[str] = mapped_column(String(64))
    embedding: Mapped[list[float] | None] = mapped_column(
        JSON(none_as_null=True),
        nullable=True,
    )
    embedding_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("entity_type", "entity_id", "chunk_index"),
        Index("idx_search_chunks_entity", "entity_type", "entity_id"),
        Index("idx_search_chunks_project", "project_id"),
        Index("idx_search_chunks_hash", "content_hash"),
    )
