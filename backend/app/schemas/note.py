"""Note Pydantic schemas for API request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.tag import TagResponse


class NoteCreate(BaseModel):
    """Schema for creating a new note."""

    title: str = Field(max_length=500, description="Note title")
    content: dict = Field(
        default_factory=lambda: {
            "type": "doc",
            "content": [{"type": "paragraph"}],
        },
        description="Tiptap JSON content",
    )
    project_id: int | None = None


class NoteUpdate(BaseModel):
    """Schema for updating an existing note. All fields optional."""

    title: str | None = Field(default=None, max_length=500)
    content: dict | None = None
    content_text: str | None = None
    pinned: bool | None = None
    project_id: int | None = None


class NoteResponse(BaseModel):
    """Schema for note responses."""

    id: int
    title: str
    content: dict
    content_text: str | None
    pinned: bool
    project_id: int | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = []

    model_config = {"from_attributes": True}
