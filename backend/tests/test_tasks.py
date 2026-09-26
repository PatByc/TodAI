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


@pytest.mark.asyncio
async def test_recurring_task_creates_one_linked_successor(async_client: AsyncClient):
    created = (
        await async_client.post(
            "/api/v1/tasks/",
            json={
                "title": "Send weekly report",
                "description": "Include the delivery summary",
                "priority": 4,
                "urgency": 5,
                "deadline": "2026-09-25T09:00:00",
                "project_id": None,
                "recurrence_unit": "weekly",
            },
        )
    ).json()
    tag = (await async_client.post("/api/v1/tags/", json={"name": "Reports"})).json()
    await async_client.post(
        "/api/v1/tags/entity",
        json={"tag_id": tag["id"], "entity_type": "task", "entity_id": created["id"]},
    )

    completed = await async_client.put(
        f"/api/v1/tasks/{created['id']}", json={"status": "done"}
    )
    assert completed.status_code == 200

    items = (await async_client.get("/api/v1/tasks/?limit=100")).json()["items"]
    successors = [
        item for item in items if item["recurrence_source_id"] == created["id"]
    ]
    assert len(successors) == 1
    successor = successors[0]
    assert successor["deadline"] == "2026-10-02T09:00:00"
    assert successor["status"] == "todo"
    assert successor["priority"] == 4
    assert successor["urgency"] == 5
    assert successor["description"] == "Include the delivery summary"
    assert successor["recurrence_occurrence"] == 2
    assert [item["name"] for item in successor["tags"]] == ["Reports"]

    await async_client.put(f"/api/v1/tasks/{created['id']}", json={"status": "done"})
    items = (await async_client.get("/api/v1/tasks/?limit=100")).json()["items"]
    assert (
        len([item for item in items if item["recurrence_source_id"] == created["id"]])
        == 1
    )


@pytest.mark.asyncio
async def test_monthly_recurrence_keeps_anchor_and_respects_limit(
    async_client: AsyncClient,
):
    first = (
        await async_client.post(
            "/api/v1/tasks/",
            json={
                "title": "Month-end close",
                "deadline": "2027-01-31T17:30:00",
                "recurrence_unit": "monthly",
                "recurrence_limit": 3,
            },
        )
    ).json()
    await async_client.put(f"/api/v1/tasks/{first['id']}", json={"status": "done"})
    items = (await async_client.get("/api/v1/tasks/?limit=100")).json()["items"]
    second = next(item for item in items if item["recurrence_source_id"] == first["id"])
    assert second["deadline"] == "2027-02-28T17:30:00"

    await async_client.put(f"/api/v1/tasks/{second['id']}", json={"status": "done"})
    items = (await async_client.get("/api/v1/tasks/?limit=100")).json()["items"]
    third = next(item for item in items if item["recurrence_source_id"] == second["id"])
    assert third["deadline"] == "2027-03-31T17:30:00"

    await async_client.put(f"/api/v1/tasks/{third['id']}", json={"status": "done"})
    items = (await async_client.get("/api/v1/tasks/?limit=100")).json()["items"]
    assert not any(item["recurrence_source_id"] == third["id"] for item in items)


@pytest.mark.asyncio
async def test_recurrence_requires_deadline_and_honors_end_date(
    async_client: AsyncClient,
):
    invalid = await async_client.post(
        "/api/v1/tasks/",
        json={"title": "No schedule", "recurrence_unit": "daily"},
    )
    assert invalid.status_code == 409

    task = (
        await async_client.post(
            "/api/v1/tasks/",
            json={
                "title": "Short run",
                "deadline": "2026-09-26T08:00:00",
                "recurrence_unit": "daily",
                "recurrence_end_date": "2026-09-26",
            },
        )
    ).json()
    await async_client.put(f"/api/v1/tasks/{task['id']}", json={"status": "done"})
    items = (await async_client.get("/api/v1/tasks/?limit=100")).json()["items"]
    assert not any(item["recurrence_source_id"] == task["id"] for item in items)
