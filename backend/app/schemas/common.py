"""Common Pydantic schemas shared across entity types."""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

from app.models.idea import IdeaState
from app.models.project import ProjectStatus
from app.models.task import TaskStatus

T = TypeVar("T")

# Re-export enums for API schema use
__all__ = [
    "ErrorResponse",
    "IdeaState",
    "PaginatedResponse",
    "PaginationParams",
    "ProjectStatus",
    "TaskStatus",
]


class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints."""

    skip: int = Field(default=0, ge=0, description="Number of items to skip")
    limit: int = Field(
        default=50, ge=1, le=100, description="Maximum items to return"
    )


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper for list endpoints."""

    items: list[T]
    total: int
    skip: int
    limit: int


class ErrorResponse(BaseModel):
    """Standard error response body."""

    detail: str
