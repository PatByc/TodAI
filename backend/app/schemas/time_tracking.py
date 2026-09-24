"""API contracts for time stream and category configuration."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class _NamedConfiguration(BaseModel):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Name cannot be empty")
        return normalized


class TimeCategoryCreate(_NamedConfiguration):
    stream_id: int = Field(gt=0)
    color_index: int | None = Field(default=None, ge=0, le=11)


class TimeCategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    stream_id: int | None = Field(default=None, gt=0)
    color_index: int | None = Field(default=None, ge=0, le=11)
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Name cannot be empty")
        return normalized


class TimeCategoryResponse(BaseModel):
    id: int
    stream_id: int
    name: str
    color_index: int
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TimeStreamCreate(_NamedConfiguration):
    color_index: int | None = Field(default=None, ge=0, le=11)


class TimeStreamUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color_index: int | None = Field(default=None, ge=0, le=11)
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Name cannot be empty")
        return normalized


class TimeStreamResponse(BaseModel):
    id: int
    name: str
    color_index: int
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime
    categories: list[TimeCategoryResponse] = []

    model_config = {"from_attributes": True}
