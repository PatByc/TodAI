"""Integration tests for the Tasks API."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_task_defaults(async_client: AsyncClient):
    """POST /api/v1/tasks/ creates a task with default priority, urgency, status."""
    response = await async_client.post(
        "/api/v1/tasks/",
        json={"title": "Default Task"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["title"] == "Default Task"
    assert data["priority"] == 3
    assert data["urgency"] == 3
    assert data["progress"] == 0
    assert data["status"] == "backlog"
    assert data["completed_at"] is None
    assert data["created_at"] is not None


@pytest.mark.asyncio
async def test_create_task_validation(async_client: AsyncClient):
    """POST /api/v1/tasks/ with priority=6 returns 422 validation error."""
    response = await async_client.post(
        "/api/v1/tasks/",
        json={"title": "Invalid Task", "priority": 6},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_task_status_done(async_client: AsyncClient):
    """Updating status to 'done' automatically sets completed_at."""
    create_resp = await async_client.post(
        "/api/v1/tasks/",
        json={"title": "Complete Me"},
    )
    task_id = create_resp.json()["id"]

    # Set to done
    update_resp = await async_client.put(
        f"/api/v1/tasks/{task_id}",
        json={"status": "done"},
    )
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["status"] == "done"
    assert data["completed_at"] is not None
    assert data["progress"] == 100

    # Set back to todo - completed_at should be cleared
    update_resp2 = await async_client.put(
        f"/api/v1/tasks/{task_id}",
        json={"status": "todo"},
    )
    data2 = update_resp2.json()
    assert data2["status"] == "todo"
    assert data2["completed_at"] is None
    assert data2["progress"] == 0


@pytest.mark.asyncio
async def test_task_progress_keeps_completion_state_in_sync(async_client: AsyncClient):
    """Progress at 100 completes a task; lowering it reopens the task."""
    create_resp = await async_client.post(
        "/api/v1/tasks/",
        json={"title": "Track Me", "status": "in_progress", "progress": 35},
    )
    task_id = create_resp.json()["id"]
    assert create_resp.json()["progress"] == 35

    complete_resp = await async_client.put(
        f"/api/v1/tasks/{task_id}",
        json={"progress": 100},
    )
    completed = complete_resp.json()
    assert completed["status"] == "done"
    assert completed["progress"] == 100
    assert completed["completed_at"] is not None

    reopen_resp = await async_client.put(
        f"/api/v1/tasks/{task_id}",
        json={"progress": 60},
    )
    reopened = reopen_resp.json()
    assert reopened["status"] == "in_progress"
    assert reopened["progress"] == 60
    assert reopened["completed_at"] is None


@pytest.mark.asyncio
async def test_filter_by_status(async_client: AsyncClient):
    """GET /api/v1/tasks/?status=backlog returns only backlog tasks."""
    # Create a backlog task
    await async_client.post(
        "/api/v1/tasks/",
        json={"title": "Backlog Task", "status": "backlog"},
    )
    # Create a done task
    create_resp = await async_client.post(
        "/api/v1/tasks/",
        json={"title": "Done Task"},
    )
    done_task_id = create_resp.json()["id"]
    await async_client.put(
        f"/api/v1/tasks/{done_task_id}",
        json={"status": "done"},
    )

    # Filter by backlog
    response = await async_client.get(
        "/api/v1/tasks/",
        params={"status": "backlog"},
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["status"] == "backlog"
