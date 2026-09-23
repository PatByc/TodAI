"""Integration tests for the Notes API."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_note(async_client: AsyncClient):
    """POST /api/v1/notes/ creates a note and returns it with id and timestamps."""
    response = await async_client.post(
        "/api/v1/notes/",
        json={"title": "Test Note", "content": {"type": "doc"}},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["title"] == "Test Note"
    assert data["content"] == {"type": "doc"}
    assert data["created_at"] is not None
    assert data["updated_at"] is not None
    assert data["pinned"] is False
    assert data["archived_at"] is None


@pytest.mark.asyncio
async def test_get_note(async_client: AsyncClient):
    """Create then GET a note by ID."""
    create_resp = await async_client.post(
        "/api/v1/notes/",
        json={"title": "Get Test Note"},
    )
    note_id = create_resp.json()["id"]

    response = await async_client.get(f"/api/v1/notes/{note_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == note_id
    assert data["title"] == "Get Test Note"


@pytest.mark.asyncio
async def test_get_note_not_found(async_client: AsyncClient):
    """GET a non-existent note returns 404."""
    response = await async_client.get("/api/v1/notes/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_note(async_client: AsyncClient):
    """Create then PUT to update a note, verify changed fields."""
    create_resp = await async_client.post(
        "/api/v1/notes/",
        json={"title": "Original Title"},
    )
    note_id = create_resp.json()["id"]

    response = await async_client.put(
        f"/api/v1/notes/{note_id}",
        json={"title": "Updated Title"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"


@pytest.mark.asyncio
async def test_delete_note(async_client: AsyncClient):
    """Create then DELETE a note, verify 204 and subsequent GET returns 404."""
    create_resp = await async_client.post(
        "/api/v1/notes/",
        json={"title": "Delete Me"},
    )
    note_id = create_resp.json()["id"]

    response = await async_client.delete(f"/api/v1/notes/{note_id}")
    assert response.status_code == 204

    get_resp = await async_client.get(f"/api/v1/notes/{note_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_archive_note(async_client: AsyncClient):
    """Create then PATCH archive a note, verify archived_at is set."""
    create_resp = await async_client.post(
        "/api/v1/notes/",
        json={"title": "Archive Me"},
    )
    note_id = create_resp.json()["id"]

    response = await async_client.patch(f"/api/v1/notes/{note_id}/archive")
    assert response.status_code == 200
    data = response.json()
    assert data["archived_at"] is not None

    # Archived note should not appear in default list
    list_resp = await async_client.get(
        "/api/v1/notes/", params={"include_archived": False}
    )
    note_ids = [n["id"] for n in list_resp.json()["items"]]
    assert note_id not in note_ids


@pytest.mark.asyncio
async def test_list_notes_pagination(async_client: AsyncClient):
    """Create 3 notes, GET with limit=2, verify total and items count."""
    for i in range(3):
        await async_client.post(
            "/api/v1/notes/",
            json={"title": f"Pagination Note {i}"},
        )

    response = await async_client.get("/api/v1/notes/", params={"limit": 2})
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] >= 3
    assert data["limit"] == 2
