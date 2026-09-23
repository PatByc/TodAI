"""Rebuildable entity indexing and hybrid retrieval."""

import hashlib
import json
import logging
import math
import re
import time
from dataclasses import dataclass
from typing import Any, Literal

from sqlalchemy import delete, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.idea import Idea
from app.models.inbox_item import InboxItem
from app.models.note import Note
from app.models.project import Project
from app.models.search_chunk import SearchChunk
from app.models.tag import EntityTag, Tag
from app.models.task import Task
from app.providers.openai_provider import OpenAIProvider
from app.providers.protocols import EmbeddingProvider
from app.schemas.search import SearchResponse, SearchResult

logger = logging.getLogger(__name__)
EntityType = Literal["note", "task", "idea", "project", "inbox_item"]

ENTITY_MODELS: dict[str, type] = {
    "note": Note,
    "task": Task,
    "idea": Idea,
    "project": Project,
    "inbox_item": InboxItem,
}
ENTITY_PATHS = {
    "note": "notes",
    "task": "tasks",
    "idea": "ideas",
    "project": "projects",
    "inbox_item": "inbox",
}


def queue_reindex(session: AsyncSession, entity_type: str, entity_id: int) -> None:
    pending = session.info.setdefault("search_pending", {})
    pending[(entity_type, entity_id)] = "index"


def queue_remove(session: AsyncSession, entity_type: str, entity_id: int) -> None:
    pending = session.info.setdefault("search_pending", {})
    pending[(entity_type, entity_id)] = "remove"


def _provider() -> EmbeddingProvider | None:
    if settings.embedding_provider != "openai" or not settings.openai_api_key:
        return None
    return OpenAIProvider(
        api_key=settings.openai_api_key,
        embedding_model=settings.embedding_model,
        embedding_dimensions=settings.embedding_dimensions,
        completion_model=settings.completion_model,
    )


def _chunks(value: str, size: int = 1200, overlap: int = 150) -> list[str]:
    value = re.sub(r"\s+", " ", value).strip()
    if not value:
        return [""]
    result: list[str] = []
    start = 0
    while start < len(value):
        end = min(len(value), start + size)
        if end < len(value):
            boundary = value.rfind(" ", start + size // 2, end)
            if boundary > start:
                end = boundary
        result.append(value[start:end].strip())
        if end == len(value):
            break
        start = max(start + 1, end - overlap)
    return result


@dataclass
class _Candidate:
    chunk: SearchChunk
    score: float


class SearchIndexService:
    def __init__(
        self, session: AsyncSession, provider: EmbeddingProvider | None = None
    ):
        self.session = session
        self.provider = provider if provider is not None else _provider()

    async def apply_pending(self) -> None:
        pending = self.session.info.pop("search_pending", {})
        if not pending:
            return
        await self.session.flush()
        for (entity_type, entity_id), action in pending.items():
            if action == "remove":
                await self.remove(entity_type, entity_id)
            else:
                await self.index_entity(entity_type, entity_id)

    async def remove(self, entity_type: str, entity_id: int) -> None:
        await self.session.execute(
            delete(SearchChunk).where(
                SearchChunk.entity_type == entity_type,
                SearchChunk.entity_id == entity_id,
            )
        )

    async def index_entity(self, entity_type: str, entity_id: int) -> int:
        model = ENTITY_MODELS.get(entity_type)
        if model is None:
            return 0
        entity = await self.session.get(model, entity_id)
        await self.remove(entity_type, entity_id)
        if entity is None or getattr(entity, "archived_at", None) is not None:
            return 0

        title, body, project_id = self._document(entity_type, entity)
        tags = await self._tags(entity_type, entity_id)
        pieces = _chunks(body)
        inputs = [f"{title}\n{piece}".strip() for piece in pieces]
        embeddings: list[list[float] | None] = [None] * len(inputs)
        model_version = None
        if self.provider and any(inputs):
            try:
                embeddings = list(await self.provider.embed(inputs))
                model_version = self.provider.model_version
            except Exception:
                logger.exception("Embedding failed; keyword index remains available")
                embeddings = [None] * len(inputs)

        for index, piece in enumerate(pieces):
            content_hash = hashlib.sha256(inputs[index].encode()).hexdigest()
            self.session.add(
                SearchChunk(
                    entity_type=entity_type,
                    entity_id=entity_id,
                    chunk_index=index,
                    section="body",
                    title=title,
                    content=piece,
                    project_id=project_id,
                    tags=tags,
                    content_hash=content_hash,
                    embedding=embeddings[index],
                    embedding_model=model_version,
                )
            )
        await self.session.flush()
        return len(pieces)

    async def rebuild(self) -> int:
        await self.session.execute(delete(SearchChunk))
        count = 0
        for entity_type, model in ENTITY_MODELS.items():
            result = await self.session.execute(select(model.id))
            for entity_id in result.scalars():
                count += await self.index_entity(entity_type, entity_id)
        return count

    async def search(
        self,
        query: str,
        mode: Literal["keyword", "semantic", "hybrid"] = "hybrid",
        limit: int = 20,
    ) -> SearchResponse:
        started = time.perf_counter()
        keyword = (
            await self._keyword_search(query, limit * 3) if mode != "semantic" else []
        )
        semantic: list[_Candidate] = []
        if mode != "keyword" and self.provider:
            try:
                vector = (await self.provider.embed([query]))[0]
                semantic = await self._semantic_search(vector, limit * 3)
            except Exception:
                logger.exception("Semantic query failed; returning keyword results")

        merged = self._rrf(keyword, semantic, limit)
        elapsed = (time.perf_counter() - started) * 1000
        return SearchResponse(
            query=query,
            mode=mode,
            semantic_available=self.provider is not None,
            results=merged,
            elapsed_ms=round(elapsed, 2),
        )

    async def _tags(self, entity_type: str, entity_id: int) -> list[str]:
        result = await self.session.execute(
            select(Tag.name)
            .join(EntityTag, EntityTag.tag_id == Tag.id)
            .where(
                EntityTag.entity_type == entity_type, EntityTag.entity_id == entity_id
            )
            .order_by(Tag.name)
        )
        return list(result.scalars())

    @staticmethod
    def _document(entity_type: str, entity: Any) -> tuple[str, str, int | None]:
        if entity_type == "note":
            return entity.title, entity.content_text or "", entity.project_id
        if entity_type == "task":
            return entity.title, entity.description or "", entity.project_id
        if entity_type == "idea":
            return entity.title, entity.content or "", entity.project_id
        if entity_type == "project":
            body = "\n".join(
                filter(
                    None, [entity.description_text, entity.goals, entity.current_focus]
                )
            )
            return entity.name, body, None
        body = entity.content_text or ""
        return (body[:100] or "Inbox item"), body, None

    async def _keyword_search(self, query: str, limit: int) -> list[_Candidate]:
        dialect = self.session.bind.dialect.name
        try:
            if dialect == "sqlite":
                tokens = re.findall(r"[\w-]+", query, flags=re.UNICODE)
                if not tokens:
                    return []
                match = " AND ".join(f'"{token}"' for token in tokens)
                rows = await self.session.execute(
                    text("""
                    SELECT sc.id, bm25(search_chunks_fts, 5.0, 1.0, 2.0) AS rank
                    FROM search_chunks_fts
                    JOIN search_chunks sc ON sc.id = search_chunks_fts.rowid
                    WHERE search_chunks_fts MATCH :query
                    ORDER BY rank LIMIT :limit
                """),
                    {"query": match, "limit": limit},
                )
                return await self._load_candidates(
                    [(row.id, -float(row.rank)) for row in rows]
                )
            if dialect == "postgresql":
                rows = await self.session.execute(
                    text("""
                    SELECT id,
                           ts_rank_cd(
                               search_document,
                               websearch_to_tsquery('simple', :query)
                           ) AS rank
                    FROM search_chunks
                    WHERE search_document @@ websearch_to_tsquery('simple', :query)
                    ORDER BY rank DESC LIMIT :limit
                """),
                    {"query": query, "limit": limit},
                )
                return await self._load_candidates(
                    [(row.id, float(row.rank)) for row in rows]
                )
        except Exception:
            logger.debug(
                "Native FTS unavailable; using portable fallback", exc_info=True
            )

        pattern = f"%{query}%"
        result = await self.session.execute(
            select(SearchChunk)
            .where(
                or_(
                    SearchChunk.title.ilike(pattern), SearchChunk.content.ilike(pattern)
                )
            )
            .limit(limit)
        )
        return [_Candidate(chunk, 1.0) for chunk in result.scalars()]

    async def _semantic_search(
        self, vector: list[float], limit: int
    ) -> list[_Candidate]:
        dialect = self.session.bind.dialect.name
        try:
            if dialect == "sqlite":
                rows = await self.session.execute(
                    text("""
                    SELECT sc.id, v.distance
                    FROM search_chunk_vectors v
                    JOIN search_chunks sc ON sc.id = v.chunk_id
                    WHERE v.embedding MATCH :embedding AND k = :limit
                    ORDER BY v.distance
                """),
                    {"embedding": json.dumps(vector), "limit": limit},
                )
                return await self._load_candidates(
                    [(row.id, 1.0 - float(row.distance)) for row in rows]
                )
            if dialect == "postgresql":
                has_native_index = await self.session.scalar(
                    text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'search_chunks'
                          AND column_name = 'embedding_vector'
                    )
                """)
                )
                if not has_native_index:
                    return await self._semantic_fallback(vector, limit)
                rows = await self.session.execute(
                    text("""
                    SELECT id,
                           1 - (
                               embedding_vector <=> CAST(:embedding AS vector)
                           ) AS score
                    FROM search_chunks WHERE embedding_vector IS NOT NULL
                    ORDER BY embedding_vector <=> CAST(:embedding AS vector)
                    LIMIT :limit
                """),
                    {"embedding": json.dumps(vector), "limit": limit},
                )
                return await self._load_candidates(
                    [(row.id, float(row.score)) for row in rows]
                )
        except Exception:
            logger.debug(
                "Native vector index unavailable; using portable fallback",
                exc_info=True,
            )

        return await self._semantic_fallback(vector, limit)

    async def _semantic_fallback(
        self, vector: list[float], limit: int
    ) -> list[_Candidate]:
        result = await self.session.execute(
            select(SearchChunk).where(SearchChunk.embedding.is_not(None))
        )
        candidates = [
            _Candidate(chunk, self._cosine(vector, list(chunk.embedding)))
            for chunk in result.scalars()
        ]
        return sorted(candidates, key=lambda item: item.score, reverse=True)[:limit]

    async def _load_candidates(
        self, pairs: list[tuple[int, float]]
    ) -> list[_Candidate]:
        if not pairs:
            return []
        result = await self.session.execute(
            select(SearchChunk).where(SearchChunk.id.in_([p[0] for p in pairs]))
        )
        by_id = {chunk.id: chunk for chunk in result.scalars()}
        return [
            _Candidate(by_id[chunk_id], score)
            for chunk_id, score in pairs
            if chunk_id in by_id
        ]

    @staticmethod
    def _cosine(left: list[float], right: list[float]) -> float:
        dot = sum(a * b for a, b in zip(left, right, strict=False))
        norm = math.sqrt(sum(a * a for a in left)) * math.sqrt(
            sum(b * b for b in right)
        )
        return dot / norm if norm else 0.0

    @staticmethod
    def _rrf(
        keyword: list[_Candidate], semantic: list[_Candidate], limit: int
    ) -> list[SearchResult]:
        scores: dict[tuple[str, int], float] = {}
        chosen: dict[tuple[str, int], SearchChunk] = {}
        matched: dict[tuple[str, int], set[str]] = {}
        for source, candidates in (("keyword", keyword), ("semantic", semantic)):
            seen: set[tuple[str, int]] = set()
            rank = 0
            for candidate in candidates:
                key = (candidate.chunk.entity_type, candidate.chunk.entity_id)
                if key in seen:
                    continue
                seen.add(key)
                rank += 1
                scores[key] = scores.get(key, 0.0) + 1.0 / (60 + rank)
                chosen.setdefault(key, candidate.chunk)
                matched.setdefault(key, set()).add(source)
        ordered = sorted(scores, key=scores.get, reverse=True)[:limit]
        results = []
        for key in ordered:
            chunk = chosen[key]
            snippet = chunk.content[:220] + ("…" if len(chunk.content) > 220 else "")
            path = ENTITY_PATHS[chunk.entity_type]
            url = (
                f"/{path}/{chunk.entity_id}"
                if chunk.entity_type != "inbox_item"
                else "/inbox"
            )
            results.append(
                SearchResult(
                    entity_type=chunk.entity_type,
                    entity_id=chunk.entity_id,
                    chunk_index=chunk.chunk_index,
                    title=chunk.title,
                    snippet=snippet,
                    section=chunk.section,
                    project_id=chunk.project_id,
                    tags=chunk.tags,
                    score=scores[key],
                    matched_by=sorted(matched[key]),
                    url=url,
                )
            )
        return results
