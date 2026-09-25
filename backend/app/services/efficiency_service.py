"""Request-scoped, content-free efficiency instrumentation."""

from __future__ import annotations

import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.efficiency_metric import EfficiencyMetric


@dataclass
class EfficiencyCollector:
    operation: str
    started_at: datetime
    started_clock: float
    success: bool = True
    error_type: str | None = None
    model: str | None = None
    input_tokens: int = 0
    cached_input_tokens: int = 0
    output_tokens: int = 0
    embedding_tokens: int = 0
    completion_requests: int = 0
    embedding_requests: int = 0
    db_queries: int = 0
    db_time_ms: float = 0
    tool_calls: int = 0
    tool_chars_before: int = 0
    tool_chars_after: int = 0
    compression_tokens_before: int = 0
    compression_tokens_after: int = 0
    compression_failures: int = 0
    indexed_chunks: int = 0
    embeddings_created: int = 0
    embeddings_reused: int = 0


_collector: ContextVar[EfficiencyCollector | None] = ContextVar(
    "todai_efficiency_collector", default=None
)
_last_pruned: date | None = None


def current_collector() -> EfficiencyCollector | None:
    return _collector.get()


def record_db_query(elapsed_ms: float) -> None:
    collector = current_collector()
    if collector:
        collector.db_queries += 1
        collector.db_time_ms += elapsed_ms


def record_completion_usage(response: Any, model: str) -> None:
    collector = current_collector()
    if collector is None:
        return
    usage = getattr(response, "usage", None)
    collector.model = model
    collector.completion_requests += 1
    if usage is None:
        return
    collector.input_tokens += int(getattr(usage, "input_tokens", 0) or 0)
    collector.output_tokens += int(getattr(usage, "output_tokens", 0) or 0)
    details = getattr(usage, "input_tokens_details", None)
    collector.cached_input_tokens += int(getattr(details, "cached_tokens", 0) or 0)


def record_embedding_usage(response: Any, model: str, inputs: int) -> None:
    collector = current_collector()
    if collector is None:
        return
    usage = getattr(response, "usage", None)
    collector.model = collector.model or model
    collector.embedding_requests += 1
    collector.embeddings_created += inputs
    if usage is not None:
        collector.embedding_tokens += int(
            getattr(usage, "prompt_tokens", None)
            or getattr(usage, "total_tokens", 0)
            or 0
        )


def record_tool_output(before: int, after: int) -> None:
    collector = current_collector()
    if collector:
        collector.tool_calls += 1
        collector.tool_chars_before += before
        collector.tool_chars_after += after


def record_compression(before: int, after: int, *, failed: bool = False) -> None:
    collector = current_collector()
    if collector:
        collector.compression_tokens_before += before
        collector.compression_tokens_after += after
        collector.compression_failures += int(failed)


def record_indexing(*, chunks: int = 0, reused: int = 0) -> None:
    collector = current_collector()
    if collector:
        collector.indexed_chunks += chunks
        collector.embeddings_reused += reused


async def _persist(session: AsyncSession, collector: EfficiencyCollector) -> None:
    global _last_pruned
    now = datetime.now(UTC).replace(tzinfo=None)
    if _last_pruned != now.date():
        await session.execute(
            delete(EfficiencyMetric).where(
                EfficiencyMetric.started_at < now - timedelta(days=30)
            )
        )
        _last_pruned = now.date()
    session.add(
        EfficiencyMetric(
            operation=collector.operation,
            started_at=collector.started_at,
            duration_ms=round(
                (time.perf_counter() - collector.started_clock) * 1000, 2
            ),
            success=collector.success,
            error_type=collector.error_type,
            model=collector.model,
            input_tokens=collector.input_tokens,
            cached_input_tokens=collector.cached_input_tokens,
            output_tokens=collector.output_tokens,
            embedding_tokens=collector.embedding_tokens,
            completion_requests=collector.completion_requests,
            embedding_requests=collector.embedding_requests,
            db_queries=collector.db_queries,
            db_time_ms=round(collector.db_time_ms, 2),
            tool_calls=collector.tool_calls,
            tool_chars_before=collector.tool_chars_before,
            tool_chars_after=collector.tool_chars_after,
            compression_tokens_before=collector.compression_tokens_before,
            compression_tokens_after=collector.compression_tokens_after,
            compression_failures=collector.compression_failures,
            indexed_chunks=collector.indexed_chunks,
            embeddings_created=collector.embeddings_created,
            embeddings_reused=collector.embeddings_reused,
        )
    )
    await session.commit()


@asynccontextmanager
async def measure_operation(
    session: AsyncSession, operation: str
) -> AsyncIterator[EfficiencyCollector]:
    """Measure one top-level operation; nested spans share the parent."""
    active = current_collector()
    if active is not None:
        yield active
        return
    collector = EfficiencyCollector(
        operation=operation,
        started_at=datetime.now(UTC).replace(tzinfo=None),
        started_clock=time.perf_counter(),
    )
    token = _collector.set(collector)
    try:
        yield collector
    except BaseException as exc:
        collector.success = False
        collector.error_type = type(exc).__name__
        raise
    finally:
        _collector.reset(token)
        try:
            await _persist(session, collector)
        except Exception:  # noqa: BLE001 - metrics must never fail the operation
            await session.rollback()
