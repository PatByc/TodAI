"""Rebuildable entity indexing and hybrid retrieval."""

import hashlib
import heapq
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
from app.services.efficiency_service import record_indexing

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
        removals: dict[str, list[int]] = {}
        updates: dict[str, list[int]] = {}
        for (entity_type, entity_id), action in pending.items():
            target = removals if action == "remove" else updates
            target.setdefault(entity_type, []).append(entity_id)
        for entity_type, entity_ids in removals.items():
            await self._remove_many(entity_type, entity_ids)
        for entity_type, entity_ids in updates.items():
            await self._index_entities(entity_type, entity_ids)

    async def remove(self, entity_type: str, entity_id: int) -> None:
        await self._remove_many(entity_type, [entity_id])

    async def _remove_many(self, entity_type: str, entity_ids: list[int]) -> None:
        if not entity_ids:
            return
        await self.session.execute(
            delete(SearchChunk).where(
                SearchChunk.entity_type == entity_type,
                SearchChunk.entity_id.in_(entity_ids),
            )
        )

    async def index_entity(self, entity_type: str, entity_id: int) -> int:
        return await self._index_entities(entity_type, [entity_id])

    async def _index_entities(
        self,
        entity_type: str,
        entity_ids: list[int],
        *,
        entities: list[Any] | None = None,
        remove_stale: bool = False,
    ) -> int:
        model = ENTITY_MODELS.get(entity_type)
        if model is None:
            return 0
        unique_ids = list(dict.fromkeys(entity_ids))
        if not unique_ids:
            if remove_stale:
                await self.session.execute(
                    delete(SearchChunk).where(SearchChunk.entity_type == entity_type)
                )
            return 0
        if entities is None:
            result = await self.session.execute(
                select(model).where(model.id.in_(unique_ids))
            )
            entities = list(result.scalars())
        by_id = {entity.id: entity for entity in entities}
        tags_by_id = await self._tags_many(entity_type, unique_ids)
        existing_query = select(SearchChunk).where(
            SearchChunk.entity_type == entity_type
        )
        if not remove_stale:
            existing_query = existing_query.where(SearchChunk.entity_id.in_(unique_ids))
        existing_result = await self.session.execute(existing_query)
        existing_by_id: dict[int, list[SearchChunk]] = {}
        for chunk in existing_result.scalars():
            existing_by_id.setdefault(chunk.entity_id, []).append(chunk)

        prepared: dict[int, dict[str, Any]] = {}
        embed_jobs: list[tuple[int, int, str]] = []
        delete_ids: set[int] = set()
        reused_count = 0
        current_model = self.provider.model_version if self.provider else None
        for entity_id in unique_ids:
            entity = by_id.get(entity_id)
            old_chunks = existing_by_id.get(entity_id, [])
            if entity is None or getattr(entity, "archived_at", None) is not None:
                if old_chunks:
                    delete_ids.add(entity_id)
                continue
            title, body, project_id = self._document(entity_type, entity)
            pieces = _chunks(body)
            inputs = [f"{title}\n{piece}".strip() for piece in pieces]
            hashes = [hashlib.sha256(value.encode()).hexdigest() for value in inputs]
            reusable: dict[str, SearchChunk] = {}
            for chunk in old_chunks:
                previous = reusable.get(chunk.content_hash)
                if previous is None or (
                    current_model
                    and chunk.embedding_model == current_model
                    and previous.embedding_model != current_model
                ):
                    reusable[chunk.content_hash] = chunk
            embeddings: list[list[float] | None] = []
            embedding_models: list[str | None] = []
            for index, content_hash in enumerate(hashes):
                old = reusable.get(content_hash)
                reusable_embedding = bool(old and old.embedding)
                embeddings.append(list(old.embedding) if reusable_embedding else None)
                embedding_models.append(old.embedding_model if old else None)
                if reusable_embedding and (
                    self.provider is None or old.embedding_model == current_model
                ):
                    reused_count += 1
                if self.provider and (
                    old is None
                    or old.embedding is None
                    or old.embedding_model != current_model
                ):
                    embed_jobs.append((entity_id, index, inputs[index]))
            prepared[entity_id] = {
                "title": title,
                "project_id": project_id,
                "tags": tags_by_id.get(entity_id, []),
                "pieces": pieces,
                "hashes": hashes,
                "embeddings": embeddings,
                "embedding_models": embedding_models,
                "old": sorted(old_chunks, key=lambda chunk: chunk.chunk_index),
            }

        if self.provider and embed_jobs:
            for start in range(0, len(embed_jobs), 64):
                batch = embed_jobs[start : start + 64]
                try:
                    vectors = await self.provider.embed([job[2] for job in batch])
                    if len(vectors) != len(batch):
                        raise ValueError(
                            "Embedding provider returned the wrong batch size"
                        )
                    for (entity_id, index, _), vector in zip(
                        batch, vectors, strict=True
                    ):
                        prepared[entity_id]["embeddings"][index] = vector
                        prepared[entity_id]["embedding_models"][index] = current_model
                except Exception:
                    logger.exception(
                        "Embedding batch failed; preserving reusable vectors"
                    )

        total = 0
        dirty: dict[int, dict[str, Any]] = {}
        for entity_id, document in prepared.items():
            total += len(document["pieces"])
            if not self._index_is_current(document):
                delete_ids.add(entity_id)
                dirty[entity_id] = document
        if remove_stale:
            delete_ids.update(set(existing_by_id) - set(by_id))
        await self._remove_many(entity_type, list(delete_ids))

        for entity_id, document in dirty.items():
            for index, piece in enumerate(document["pieces"]):
                self.session.add(
                    SearchChunk(
                        entity_type=entity_type,
                        entity_id=entity_id,
                        chunk_index=index,
                        section="body",
                        title=document["title"],
                        content=piece,
                        project_id=document["project_id"],
                        tags=document["tags"],
                        content_hash=document["hashes"][index],
                        embedding=document["embeddings"][index],
                        embedding_model=document["embedding_models"][index],
                    )
                )
        await self.session.flush()
        record_indexing(chunks=total, reused=reused_count)
        return total

    @staticmethod
    def _index_is_current(document: dict[str, Any]) -> bool:
        old: list[SearchChunk] = document["old"]
        if len(old) != len(document["pieces"]):
            return False
        return all(
            chunk.chunk_index == index
            and chunk.section == "body"
            and chunk.title == document["title"]
            and chunk.content == document["pieces"][index]
            and chunk.project_id == document["project_id"]
            and list(chunk.tags or []) == document["tags"]
            and chunk.content_hash == document["hashes"][index]
            and chunk.embedding_model == document["embedding_models"][index]
            for index, chunk in enumerate(old)
        )

    async def rebuild(self) -> int:
        count = 0
        for entity_type, model in ENTITY_MODELS.items():
            result = await self.session.execute(select(model))
            entities = list(result.scalars())
            count += await self._index_entities(
                entity_type,
                [entity.id for entity in entities],
                entities=entities,
                remove_stale=True,
            )
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
        return (await self._tags_many(entity_type, [entity_id]))[entity_id]

    async def _tags_many(
        self, entity_type: str, entity_ids: list[int]
    ) -> dict[int, list[str]]:
        tags = {entity_id: [] for entity_id in entity_ids}
        if not entity_ids:
            return tags
        result = await self.session.execute(
            select(EntityTag.entity_id, Tag.name)
            .join(EntityTag, EntityTag.tag_id == Tag.id)
            .where(
                EntityTag.entity_type == entity_type,
                EntityTag.entity_id.in_(entity_ids),
            )
            .order_by(EntityTag.entity_id, Tag.name)
        )
        for entity_id, name in result:
            tags[entity_id].append(name)
        return tags

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
                cache_key = "search_has_native_vector_index"
                has_native_index = self.session.info.get(cache_key)
                if has_native_index is None:
                    has_native_index = bool(
                        await self.session.scalar(
                            text("""
                            SELECT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'search_chunks'
                                  AND column_name = 'embedding_vector'
                            )
                        """)
                        )
                    )
                    self.session.info[cache_key] = has_native_index
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
            select(SearchChunk.id, SearchChunk.embedding).where(
                SearchChunk.embedding.is_not(None)
            )
        )
        best = heapq.nlargest(
            limit,
            (
                (self._cosine(vector, list(embedding)), chunk_id)
                for chunk_id, embedding in result
            ),
        )
        return await self._load_candidates(
            [(chunk_id, score) for score, chunk_id in best]
        )

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
