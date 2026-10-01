"""Contracts for first-run workspace onboarding."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class OnboardingComplete(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)
    project_name: str = Field(min_length=1, max_length=500)
    task_title: str = Field(min_length=1, max_length=500)

    @field_validator("display_name", "project_name", "task_title", mode="before")
    @classmethod
    def trim_text(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value


class WorkspaceProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)

    @field_validator("display_name", mode="before")
    @classmethod
    def trim_name(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value


class OnboardingState(BaseModel):
    current_version: int
    should_show: bool
    outcome: Literal["pending", "completed", "skipped", "not_required"]
    display_name: str | None = None
    starter_project_id: int | None = None
    starter_task_id: int | None = None
