"""Tag Pydantic schemas for API request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.core.colors import WORKSPACE_COLOR_MAX_INDEX


class TagCreate(BaseModel):
    """Schema for creating a new tag."""

    name: str = Field(min_length=1, max_length=100, description="Tag name")
    color_index: int | None = Field(default=None, ge=0, le=WORKSPACE_COLOR_MAX_INDEX)


class TagUpdate(BaseModel):
    """Editable shared-tag properties."""

    color_index: int = Field(ge=0, le=WORKSPACE_COLOR_MAX_INDEX)


class TagResponse(BaseModel):
    """Schema for tag responses."""

    id: int
    name: str
    color_index: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TagSummaryResponse(TagResponse):
    """Tag response with its current number of entity associations."""

    usage_count: int


class EntityTagCreate(BaseModel):
    """Schema for associating a tag with an entity."""

    tag_id: int
    entity_type: str
    entity_id: int


class EntityTagResponse(BaseModel):
    """Schema for entity-tag association responses."""

    id: int
    tag_id: int
    tag_name: str
    entity_type: str
    entity_id: int
