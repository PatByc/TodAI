"""Tag Pydantic schemas for API request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    """Schema for creating a new tag."""

    name: str = Field(max_length=100, description="Tag name")


class TagResponse(BaseModel):
    """Schema for tag responses."""

    id: int
    name: str
    color_index: int
    created_at: datetime

    model_config = {"from_attributes": True}


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
