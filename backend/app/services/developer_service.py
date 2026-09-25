"""Read-only aggregation for the Developer efficiency dashboard."""

from collections import Counter, defaultdict
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.efficiency_metric import EfficiencyMetric
from app.models.search_chunk import SearchChunk
from app.schemas.developer import (
    DeveloperMetricsResponse,
    EfficiencyDay,
    EfficiencyOperation,
    EfficiencyTotals,
    IndexHealth,
)


def _totals(rows: list[EfficiencyMetric]) -> EfficiencyTotals:
    durations = sorted(row.duration_ms for row in rows)
    p95_index = max(0, int(len(durations) * 0.95 + 0.999) - 1)
    before = sum(row.compression_tokens_before for row in rows)
    after = sum(row.compression_tokens_after for row in rows)
    count = len(rows)
    successful = sum(row.success for row in rows)
    return EfficiencyTotals(
        operations=count,
        successful=successful,
        success_rate=round(successful / count * 100, 1) if count else 0,
        average_duration_ms=round(sum(durations) / count, 2) if count else 0,
        p95_duration_ms=round(durations[p95_index], 2) if durations else 0,
        input_tokens=sum(row.input_tokens for row in rows),
        cached_input_tokens=sum(row.cached_input_tokens for row in rows),
        output_tokens=sum(row.output_tokens for row in rows),
        embedding_tokens=sum(row.embedding_tokens for row in rows),
        db_queries=sum(row.db_queries for row in rows),
        db_time_ms=round(sum(row.db_time_ms for row in rows), 2),
        tool_chars_before=sum(row.tool_chars_before for row in rows),
        tool_chars_after=sum(row.tool_chars_after for row in rows),
        compression_tokens_before=before,
        compression_tokens_after=after,
        compression_saved_tokens=max(0, before - after),
        indexed_chunks=sum(row.indexed_chunks for row in rows),
        embeddings_created=sum(row.embeddings_created for row in rows),
        embeddings_reused=sum(row.embeddings_reused for row in rows),
    )


class DeveloperService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def metrics(self, days: int, recent_limit: int) -> DeveloperMetricsResponse:
        now = datetime.now(UTC).replace(tzinfo=None)
        start = now - timedelta(days=days)
        rows = list(
            (
                await self.session.execute(
                    select(EfficiencyMetric)
                    .where(EfficiencyMetric.started_at >= start)
                    .order_by(EfficiencyMetric.started_at.desc())
                )
            ).scalars()
        )
        grouped: dict[date, list[EfficiencyMetric]] = defaultdict(list)
        for row in rows:
            grouped[row.started_at.date()].append(row)
        daily = []
        for offset in reversed(range(days)):
            day = now.date() - timedelta(days=offset)
            daily.append(EfficiencyDay(date=day, **_totals(grouped[day]).model_dump()))

        index_rows = (
            await self.session.execute(
                select(
                    SearchChunk.entity_type,
                    SearchChunk.embedding_model,
                    func.count(SearchChunk.id),
                    func.count(SearchChunk.embedding),
                ).group_by(SearchChunk.entity_type, SearchChunk.embedding_model)
            )
        ).all()
        by_type: Counter[str] = Counter()
        models: Counter[str] = Counter()
        total = embedded = 0
        for entity_type, model, count, embedded_count in index_rows:
            total += count
            embedded += embedded_count
            by_type[entity_type] += count
            if model:
                models[model] += embedded_count

        recent = [
            EfficiencyOperation(
                id=row.id,
                operation=row.operation,
                started_at=row.started_at,
                duration_ms=row.duration_ms,
                success=row.success,
                error_type=row.error_type,
                model=row.model,
                input_tokens=row.input_tokens,
                output_tokens=row.output_tokens,
                embedding_tokens=row.embedding_tokens,
                db_queries=row.db_queries,
                tool_chars_before=row.tool_chars_before,
                tool_chars_after=row.tool_chars_after,
                compression_saved_tokens=max(
                    0,
                    row.compression_tokens_before - row.compression_tokens_after,
                ),
                embeddings_created=row.embeddings_created,
                embeddings_reused=row.embeddings_reused,
            )
            for row in rows[:recent_limit]
        ]
        return DeveloperMetricsResponse(
            period_days=days,
            generated_at=now,
            summary=_totals(rows),
            daily=daily,
            recent=recent,
            index=IndexHealth(
                total_chunks=total,
                embedded_chunks=embedded,
                by_entity_type=dict(by_type),
                embedding_models=dict(models),
            ),
        )
