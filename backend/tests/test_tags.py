"""Integration tests for the Tags API."""

import uuid

import pytest
from httpx import AsyncClient


def _unique(prefix: str) -> str:
    """Generate a unique name to avoid collisions across test runs."""
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


@pytest.mark.asyncio
async def test_create_tag(async_client: AsyncClient):
    """POST /api/v1/tags/ creates a tag with auto-assigned color_index."""
    name = _unique("create-tag")
    response = await async_client.post(
        "/api/v1/tags/",
        json={"name": name},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["name"] == name
    assert "color_index" in data


@pytest.mark.asyncio
async def test_add_tag_to_note(async_client: AsyncClient):
    """Create a tag and a note, then associate them."""
    tag_name = _unique("note-tag")
    tag_resp = await async_client.post(
        "/api/v1/tags/",
        json={"name": tag_name},
    )
    tag_id = tag_resp.json()["id"]

    note_resp = await async_client.post(
        "/api/v1/notes/",
        json={"title": "Tagged Note"},
    )
    note_id = note_resp.json()["id"]

    assoc_resp = await async_client.post(
        "/api/v1/tags/entity",
        json={"tag_id": tag_id, "entity_type": "note", "entity_id": note_id},
    )
    assert assoc_resp.status_code == 201

    tags_resp = await async_client.get(f"/api/v1/tags/entity/note/{note_id}")
    assert tags_resp.status_code == 200
    tags = tags_resp.json()
    assert len(tags) >= 1
    assert any(t["id"] == tag_id for t in tags)


@pytest.mark.asyncio
async def test_search_tags_autocomplete(async_client: AsyncClient):
    """GET /api/v1/tags/search?q=<prefix> returns matching tags."""
    prefix = _unique("srch")
    await async_client.post("/api/v1/tags/", json={"name": f"{prefix}-alpha"})
    await async_client.post("/api/v1/tags/", json={"name": f"{prefix}-beta"})
    await async_client.post("/api/v1/tags/", json={"name": "unrelated-xyz-99"})

    response = await async_client.get(
        "/api/v1/tags/search",
        params={"q": prefix},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    for tag in data:
        assert tag["name"].startswith(prefix)


@pytest.mark.asyncio
async def test_filter_entities_by_tag(async_client: AsyncClient):
    """Create notes with tags and filter by tag_ids."""
    tag_name = _unique("filter-tag")
    tag_resp = await async_client.post(
        "/api/v1/tags/",
        json={"name": tag_name},
    )
    tag_id = tag_resp.json()["id"]

    note1_resp = await async_client.post(
        "/api/v1/notes/",
        json={"title": "Tagged Note 1"},
    )
    note1_id = note1_resp.json()["id"]

    await async_client.post(
        "/api/v1/notes/",
        json={"title": "Untagged Note"},
    )

    await async_client.post(
        "/api/v1/tags/entity",
        json={"tag_id": tag_id, "entity_type": "note", "entity_id": note1_id},
    )

    response = await async_client.get(
        "/api/v1/notes/",
        params={"tag_ids": [tag_id]},
    )
    assert response.status_code == 200
    data = response.json()
    note_ids = [n["id"] for n in data["items"]]
    assert note1_id in note_ids
