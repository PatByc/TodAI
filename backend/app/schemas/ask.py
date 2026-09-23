"""Read-only Ask mode request and response contracts."""

from typing import Literal

from pydantic import BaseModel, Field


class AskTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    history: list[AskTurn] = Field(default_factory=list, max_length=12)


class AskSource(BaseModel):
    number: int
    entity_type: str
    entity_id: int
    title: str
    section: str
    url: str
    excerpt: str


class AskResponse(BaseModel):
    answer: str
    sources: list[AskSource]
    retrieval_mode: Literal["keyword", "hybrid"]


class AskStatus(BaseModel):
    available: bool
    reason: str | None = None
