"""Inbox Pydantic schemas for API request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.tag import TagResponse


class InboxItemCreate(BaseModel):
    """Schema for creating a new inbox item. Minimal — content only (CAP-01)."""

    content: dict = Field(default_factory=dict, description="Tiptap JSON content")


class InboxItemResponse(BaseModel):
    """Schema for inbox item responses."""

    id: int
    content: dict
    content_text: str | None
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = []

    model_config = {"from_attributes": True}
