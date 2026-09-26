"""Integration coverage for automatic and hybrid search indexing."""

import asyncio

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.config import sqlite_url
from app.database import TodAISession, create_database_engine
from app.migrations import upgrade_database
from app.models.search_chunk import SearchChunk
from app.services.search_index_service import SearchIndexService


@pytest.mark.asyncio
async def test_create_update_archive_maintains_search_index(
    async_client: AsyncClient, async_session
):
    created = await async_client.post(
        "/api/v1/notes/",
        json={
            "title": "Launch checklist",
            "content": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Book the venue"}],
                    }
                ],
            },
        },
    )
    note_id = created.json()["id"]

    response = await async_client.get("/api/v1/search", params={"q": "venue"})
    assert response.status_code == 200
    assert response.json()["results"][0]["entity_id"] == note_id

    await async_client.put(
        f"/api/v1/notes/{note_id}", json={"title": "Release checklist"}
    )
    old = await async_client.get("/api/v1/search", params={"q": "Launch"})
    new = await async_client.get("/api/v1/search", params={"q": "Release"})
    assert old.json()["results"] == []
    assert new.json()["results"][0]["title"] == "Release checklist"

    await async_client.patch(f"/api/v1/notes/{note_id}/archive")
    archived = await async_client.get("/api/v1/search", params={"q": "Release"})
    assert archived.json()["results"] == []
    count = await async_session.scalar(select(func.count()).select_from(SearchChunk))
    assert count == 0


class FakeEmbeddingProvider:
    model_version = "fake:semantic:v1"

    def __init__(self) -> None:
        self.calls: list[list[str]] = []

    async def embed(self, texts: list[str]) -> list[list[float]]:
        self.calls.append(texts)
        vectors = []
        for value in texts:
            normalized = value.lower()
            leading = (
                [1.0, 0.0]
                if {"holiday", "vacation"} & set(normalized.split())
                else [0.0, 1.0]
            )
            vectors.append(leading + [0.0] * 1534)
        return vectors


@pytest.mark.asyncio
async def test_semantic_search_and_rebuild_are_provider_agnostic(async_session):
    from app.models.idea import Idea

    idea = Idea(title="Summer plans", content="vacation", state="RAW")
    async_session.add(idea)
    await async_session.flush()

    service = SearchIndexService(async_session, provider=FakeEmbeddingProvider())
    assert await service.rebuild() == 1
    response = await service.search("holiday", mode="semantic")

    assert response.semantic_available is True
    assert response.results[0].title == "Summer plans"
    assert response.results[0].matched_by == ["semantic"]


@pytest.mark.asyncio
async def test_rebuild_reuses_unchanged_embeddings(async_session):
    from app.models.note import Note

    note = Note(title="Stable", content={"type": "doc"}, content_text="same text")
    async_session.add(note)
    await async_session.flush()
    provider = FakeEmbeddingProvider()
    service = SearchIndexService(async_session, provider=provider)

    await service.rebuild()
    await service.rebuild()

    assert len(provider.calls) == 1
    assert len(provider.calls[0]) == 1


@pytest.mark.asyncio
async def test_migrated_sqlite_uses_native_vector_index(tmp_path):
    from app.models.idea import Idea, IdeaState

    database_url = sqlite_url(tmp_path / "native-vector.db")
    await asyncio.to_thread(upgrade_database, database_url)
    engine = create_database_engine(database_url)
    try:
        async with TodAISession(bind=engine, expire_on_commit=False) as session:
            session.add(
                Idea(title="Time away", content="vacation", state=IdeaState.RAW)
            )
            await session.flush()
            service = SearchIndexService(session, provider=FakeEmbeddingProvider())
            await service.rebuild()
            await session.commit()

            response = await service.search("holiday", mode="semantic")
            assert response.results[0].title == "Time away"
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_global_search_matches_tag_names_across_entity_types(tmp_path):
    from app.models.note import Note
    from app.models.tag import EntityTag, Tag
    from app.models.task import Task

    database_url = sqlite_url(tmp_path / "content-only-search.db")
    await asyncio.to_thread(upgrade_database, database_url)
    engine = create_database_engine(database_url)
    try:
        async with TodAISession(bind=engine, expire_on_commit=False) as session:
            note = Note(
                title="Quarterly planning",
                content={"type": "doc"},
                content_text="Prepare the roadmap review",
            )
            task = Task(title="Draft launch agenda")
            tag = Tag(name="tag-only-marker", color_index=0)
            session.add_all([note, task, tag])
            await session.flush()
            session.add_all(
                [
                    EntityTag(
                        tag_id=tag.id, entity_type="note", entity_id=note.id
                    ),
                    EntityTag(
                        tag_id=tag.id, entity_type="task", entity_id=task.id
                    ),
                ]
            )
            await session.flush()

            service = SearchIndexService(session, provider=None)
            await service.rebuild()
            await session.commit()

            tag_matches = await service.search("tag-only-marker", mode="keyword")
            content_match = await service.search("roadmap", mode="keyword")

            assert {
                (result.entity_type, result.entity_id)
                for result in tag_matches.results
            } == {("note", note.id), ("task", task.id)}
            assert content_match.results[0].entity_id == note.id
            assert content_match.results[0].tags == ["tag-only-marker"]
    finally:
        await engine.dispose()
