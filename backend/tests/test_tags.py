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
async def test_create_and_recolor_tag_from_shared_palette(async_client: AsyncClient):
    created = await async_client.post(
        "/api/v1/tags/",
        json={"name": _unique("colored-tag"), "color_index": 4},
    )
    assert created.status_code == 201
    assert created.json()["color_index"] == 4

    updated = await async_client.patch(
        f"/api/v1/tags/{created.json()['id']}", json={"color_index": 9}
    )
    assert updated.status_code == 200
    assert updated.json()["color_index"] == 9

    invalid = await async_client.patch(
        f"/api/v1/tags/{created.json()['id']}", json={"color_index": 24}
    )
    assert invalid.status_code == 422


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
    listed_note = next(note for note in data["items"] if note["id"] == note1_id)
    assert listed_note["tags"] == [tag_resp.json()]


@pytest.mark.asyncio
async def test_task_list_includes_attached_tags(async_client: AsyncClient):
    """Task cards receive their attached tags from the list endpoint."""
    tag = (
        await async_client.post(
            "/api/v1/tags/", json={"name": _unique("task-card-tag")}
        )
    ).json()
    task = (
        await async_client.post("/api/v1/tasks/", json={"title": "Tagged task card"})
    ).json()

    response = await async_client.post(
        "/api/v1/tags/entity",
        json={"tag_id": tag["id"], "entity_type": "task", "entity_id": task["id"]},
    )
    assert response.status_code == 201

    tasks = (await async_client.get("/api/v1/tasks/", params={"limit": 100})).json()[
        "items"
    ]
    listed_task = next(item for item in tasks if item["id"] == task["id"])
    assert listed_task["tags"] == [tag]


@pytest.mark.asyncio
async def test_list_tag_usage_and_delete_globally(async_client: AsyncClient):
    """Deleting a shared tag removes every association and the tag itself."""
    tag = (
        await async_client.post("/api/v1/tags/", json={"name": _unique("delete-tag")})
    ).json()
    note = (
        await async_client.post("/api/v1/notes/", json={"title": "Tagged note"})
    ).json()
    task = (
        await async_client.post("/api/v1/tasks/", json={"title": "Tagged task"})
    ).json()
    for entity_type, entity_id in (("note", note["id"]), ("task", task["id"])):
        response = await async_client.post(
            "/api/v1/tags/entity",
            json={
                "tag_id": tag["id"],
                "entity_type": entity_type,
                "entity_id": entity_id,
            },
        )
        assert response.status_code == 201

    listed = (await async_client.get("/api/v1/tags/")).json()
    summary = next(item for item in listed if item["id"] == tag["id"])
    assert summary["usage_count"] == 2

    deleted = await async_client.delete(f"/api/v1/tags/{tag['id']}")
    assert deleted.status_code == 204
    assert (
        await async_client.get(f"/api/v1/tags/entity/note/{note['id']}")
    ).json() == []
    assert (
        await async_client.get(f"/api/v1/tags/entity/task/{task['id']}")
    ).json() == []
    listed = (await async_client.get("/api/v1/tags/")).json()
    assert not any(item["id"] == tag["id"] for item in listed)

    missing = await async_client.delete(f"/api/v1/tags/{tag['id']}")
    assert missing.status_code == 404
