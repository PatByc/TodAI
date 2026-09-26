"""Developer efficiency dashboard contracts."""

from datetime import date, datetime

from pydantic import BaseModel, Field


class EfficiencyTotals(BaseModel):
    operations: int = 0
    successful: int = 0
    success_rate: float = 0
    average_duration_ms: float = 0
    p95_duration_ms: float = 0
    input_tokens: int = 0
    cached_input_tokens: int = 0
    output_tokens: int = 0
    embedding_tokens: int = 0
    db_queries: int = 0
    db_time_ms: float = 0
    tool_chars_before: int = 0
    tool_chars_after: int = 0
    compression_tokens_before: int = 0
    compression_tokens_after: int = 0
    compression_saved_tokens: int = 0
    indexed_chunks: int = 0
    embeddings_created: int = 0
    embeddings_reused: int = 0


class EfficiencyDay(EfficiencyTotals):
    date: date


class EfficiencyOperation(BaseModel):
    id: int
    operation: str
    started_at: datetime
    duration_ms: float
    success: bool
    error_type: str | None
    model: str | None
    input_tokens: int
    output_tokens: int
    embedding_tokens: int
    db_queries: int
    tool_chars_before: int
    tool_chars_after: int
    compression_saved_tokens: int
    embeddings_created: int
    embeddings_reused: int


class IndexHealth(BaseModel):
    total_chunks: int = 0
    embedded_chunks: int = 0
    by_entity_type: dict[str, int] = Field(default_factory=dict)
    embedding_models: dict[str, int] = Field(default_factory=dict)


class DeveloperMetricsResponse(BaseModel):
    period_days: int
    generated_at: datetime
    summary: EfficiencyTotals
    daily: list[EfficiencyDay]
    recent: list[EfficiencyOperation]
    index: IndexHealth


class APICostTotals(BaseModel):
    requests: int = 0
    priced_requests: int = 0
    unpriced_requests: int = 0
    input_tokens: int = 0
    cached_input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float = 0


class APICostDay(APICostTotals):
    date: date


class APICostBreakdown(APICostTotals):
    provider: str
    model: str
    request_kind: str


class APICostRequest(BaseModel):
    id: int
    occurred_at: datetime
    operation: str
    provider: str
    model: str
    request_kind: str
    provider_request_id: str | None
    input_tokens: int
    cached_input_tokens: int
    output_tokens: int
    estimated_cost_usd: float | None
    pricing_status: str
    pricing_version: str | None
    input_price_per_million_usd: float | None
    cached_input_price_per_million_usd: float | None
    output_price_per_million_usd: float | None


class APICostResponse(BaseModel):
    period_days: int
    generated_at: datetime
    currency: str = "USD"
    summary: APICostTotals
    daily: list[APICostDay]
    by_model: list[APICostBreakdown]
    recent: list[APICostRequest]
