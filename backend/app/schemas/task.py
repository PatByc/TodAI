"""Task Pydantic schemas for API request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import TaskStatus
from app.schemas.tag import TagResponse


class TaskCreate(BaseModel):
    """Schema for creating a new task."""

    title: str = Field(max_length=500, description="Task title")
    description: str | None = None
    priority: int = Field(default=3, ge=1, le=5, description="Priority 1-5 (D-10)")
    urgency: int = Field(default=3, ge=1, le=5, description="Urgency 1-5 (D-11)")
    progress: int = Field(default=0, ge=0, le=100, description="Completion progress 0-100")
    status: TaskStatus = TaskStatus.BACKLOG
    deadline: datetime | None = None
    project_id: int | None = None


class TaskUpdate(BaseModel):
    """Schema for updating an existing task. All fields optional."""

    title: str | None = Field(default=None, max_length=500)
    description: str | None = None
    priority: int | None = Field(default=None, ge=1, le=5)
    urgency: int | None = Field(default=None, ge=1, le=5)
    progress: int | None = Field(default=None, ge=0, le=100)
    status: TaskStatus | None = None
    deadline: datetime | None = None
    project_id: int | None = None


class TaskResponse(BaseModel):
    """Schema for task responses."""

    id: int
    title: str
    description: str | None
    priority: int
    urgency: int
    progress: int
    status: TaskStatus
    deadline: datetime | None
    completed_at: datetime | None
    project_id: int | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = []

    model_config = {"from_attributes": True}
