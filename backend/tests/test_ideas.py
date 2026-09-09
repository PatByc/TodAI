"""Integration tests for the Ideas API."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_idea_default_state(async_client: AsyncClient):
    """POST /api/v1/ideas/ creates an idea with state defaulting to 'raw'."""
    response = await async_client.post(
        "/api/v1/ideas/",
        json={"title": "My Raw Idea"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["title"] == "My Raw Idea"
    assert data["state"] == "raw"
    assert data["created_at"] is not None


@pytest.mark.asyncio
async def test_update_idea_state(async_client: AsyncClient):
    """Create an idea then update its state to 'developing'."""
    create_resp = await async_client.post(
        "/api/v1/ideas/",
        json={"title": "Develop This"},
    )
    idea_id = create_resp.json()["id"]

    update_resp = await async_client.put(
        f"/api/v1/ideas/{idea_id}",
        json={"state": "developing"},
    )
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["state"] == "developing"


@pytest.mark.asyncio
async def test_filter_by_state(async_client: AsyncClient):
    """GET /api/v1/ideas/?state=raw returns only raw ideas."""
    await async_client.post(
        "/api/v1/ideas/",
        json={"title": "Raw Idea"},
    )
    create_resp = await async_client.post(
        "/api/v1/ideas/",
        json={"title": "To Develop"},
    )
    dev_id = create_resp.json()["id"]
    await async_client.put(
        f"/api/v1/ideas/{dev_id}",
        json={"state": "developing"},
    )

    response = await async_client.get(
        "/api/v1/ideas/",
        params={"state": "raw"},
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["state"] == "raw"
