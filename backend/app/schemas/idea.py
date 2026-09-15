"""Idea Pydantic schemas for API request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import IdeaState
from app.schemas.tag import TagResponse


class IdeaCreate(BaseModel):
    """Schema for creating a new idea."""

    title: str = Field(max_length=500, description="Idea title")
    content: str | None = None
    state: IdeaState = IdeaState.RAW
    project_id: int | None = None


class IdeaUpdate(BaseModel):
    """Schema for updating an existing idea. All fields optional."""

    title: str | None = Field(default=None, max_length=500)
    content: str | None = None
    state: IdeaState | None = None
    project_id: int | None = None


class IdeaResponse(BaseModel):
    """Schema for idea responses."""

    id: int
    title: str
    content: str | None
    state: IdeaState
    project_id: int | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = []

    model_config = {"from_attributes": True}
