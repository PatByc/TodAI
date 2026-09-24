"""Contracts for human-reviewed Agent mode."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.ask import AskTurn

EntityType = Literal["note", "task", "idea", "project", "inbox_item"]
ActionOperation = Literal[
    "create", "update", "archive", "unarchive", "delete", "convert", "tag", "untag"
]


class AgentAction(BaseModel):
    operation: ActionOperation
    entity_type: EntityType
    entity_id: int | None = Field(default=None, gt=0)
    fields: dict[str, Any] = Field(default_factory=dict)
    description: str = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def check_target(self) -> "AgentAction":
        if self.operation == "create" and self.entity_id is not None:
            raise ValueError("Create actions must not specify an entity ID")
        if self.operation != "create" and self.entity_id is None:
            raise ValueError("Existing-entity actions require an entity ID")
        return self


class AgentPlanRequest(BaseModel):
    # Long-form capture is a core workflow: users may paste meeting transcripts,
    # brain dumps, or a full set of notes for Tod to organize in one pass.
    question: str = Field(min_length=1, max_length=50_000)
    history: list[AskTurn] = Field(default_factory=list, max_length=12)
    approval_mode: Literal["manual", "auto"] = "manual"


class AgentStatus(BaseModel):
    available: bool
    reason: str | None = None


class AgentPlanResponse(BaseModel):
    id: str | None = None
    message: str
    actions: list[AgentAction] = Field(default_factory=list)
    expires_at: datetime | None = None
    sources: list[dict[str, Any]] = Field(default_factory=list)


class AgentApplyResult(BaseModel):
    operation: ActionOperation
    entity_type: EntityType
    entity_id: int | None = None
    description: str
    success: bool
    detail: str
    url: str | None = None


class AgentApplyResponse(BaseModel):
    status: Literal["applied", "failed", "rejected"]
    results: list[AgentApplyResult] = Field(default_factory=list)


class AgentRunCreated(BaseModel):
    run_id: str


class AgentRejectResponse(BaseModel):
    status: Literal["rejected"]
