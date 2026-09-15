"""Project Pydantic schemas for API request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ProjectStatus
from app.schemas.tag import TagResponse


class ProjectCreate(BaseModel):
    """Schema for creating a new project."""

    name: str = Field(max_length=500, description="Project name")
    description: dict | None = Field(default_factory=dict, description="Tiptap JSON content")
    goals: str | None = None
    current_focus: str | None = Field(default=None, max_length=500)


class ProjectUpdate(BaseModel):
    """Schema for updating an existing project. All fields optional."""

    name: str | None = Field(default=None, max_length=500)
    description: dict | None = None
    description_text: str | None = None
    goals: str | None = None
    current_focus: str | None = Field(default=None, max_length=500)
    status: ProjectStatus | None = None


class ProjectResponse(BaseModel):
    """Schema for project responses."""

    id: int
    name: str
    description: dict | None
    description_text: str | None
    goals: str | None
    current_focus: str | None
    status: ProjectStatus
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = []

    model_config = {"from_attributes": True}
