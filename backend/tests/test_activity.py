"""Integration tests for state-transition history."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_state_transitions_for_tasks(async_client: AsyncClient):
    task = (
        await async_client.post("/api/v1/tasks/", json={"title": "Transition task"})
    ).json()
    await async_client.put(
        f"/api/v1/tasks/{task['id']}", json={"status": "in_progress"}
    )
    await async_client.put(f"/api/v1/tasks/{task['id']}", json={"status": "done"})

    response = await async_client.get(
        "/api/v1/activity/transitions",
        params={"entity_type": "task", "limit": 10},
    )

    assert response.status_code == 200
    transitions = response.json()
    assert [item["new_value"] for item in transitions[:2]] == ["done", "in_progress"]
    assert all(item["entity_title"] == "Transition task" for item in transitions[:2])

    scoped_response = await async_client.get(
        "/api/v1/activity/transitions",
        params={"entity_type": "task", "entity_id": task["id"]},
    )
    assert scoped_response.status_code == 200
    assert all(item["entity_id"] == task["id"] for item in scoped_response.json())


@pytest.mark.asyncio
async def test_state_transitions_include_note_and_idea(async_client: AsyncClient):
    note = (await async_client.post("/api/v1/notes/", json={"title": "Pinned note"})).json()
    idea = (await async_client.post("/api/v1/ideas/", json={"title": "Growing idea"})).json()
    await async_client.put(f"/api/v1/notes/{note['id']}", json={"pinned": True})
    await async_client.put(f"/api/v1/ideas/{idea['id']}", json={"state": "developing"})

    response = await async_client.get("/api/v1/activity/transitions")

    assert response.status_code == 200
    transitions = response.json()
    assert any(item["entity_type"] == "note" and item["field"] == "pinned" for item in transitions)
    assert any(item["entity_type"] == "idea" and item["field"] == "state" for item in transitions)
