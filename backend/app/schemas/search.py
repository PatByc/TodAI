"""Search API schemas."""

from typing import Literal

from pydantic import BaseModel, Field


class SearchResult(BaseModel):
    entity_type: str
    entity_id: int
    chunk_index: int
    title: str
    snippet: str
    section: str
    project_id: int | None
    tags: list[str]
    score: float
    matched_by: list[Literal["keyword", "semantic"]]
    url: str


class SearchResponse(BaseModel):
    query: str
    mode: Literal["keyword", "semantic", "hybrid"]
    semantic_available: bool
    results: list[SearchResult]
    elapsed_ms: float


class RebuildResponse(BaseModel):
    chunks_indexed: int = Field(ge=0)
