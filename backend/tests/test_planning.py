"""Integration coverage for routines and measurable goals."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_routine_crud_and_daily_completion(async_client: AsyncClient):
    created = await async_client.post(
        "/api/v1/plan/routines",
        json={
            "title": "  Morning review  ",
            "description": "Set the day",
            "scheduled_time": "08:30:00",
            "weekdays": [4, 0, 0, 2],
        },
    )
    assert created.status_code == 201
    routine = created.json()
    assert routine["title"] == "Morning review"
    assert routine["weekdays"] == [0, 2, 4]

    completed = await async_client.put(
        f"/api/v1/plan/routines/{routine['id']}/completion",
        json={"completed_on": "2026-09-24", "completed": True},
    )
    assert completed.status_code == 200
    assert completed.json()["completed_dates"] == ["2026-09-24"]

    undone = await async_client.put(
        f"/api/v1/plan/routines/{routine['id']}/completion",
        json={"completed_on": "2026-09-24", "completed": False},
    )
    assert undone.status_code == 200
    assert undone.json()["completed_dates"] == []

    updated = await async_client.put(
        f"/api/v1/plan/routines/{routine['id']}", json={"is_active": False}
    )
    assert updated.status_code == 200
    assert updated.json()["is_active"] is False

    active = await async_client.get(
        "/api/v1/plan/routines", params={"include_inactive": False}
    )
    assert active.json() == []


@pytest.mark.asyncio
async def test_time_goal_crud_and_stream_validation(async_client: AsyncClient):
    stream = (
        await async_client.post("/api/v1/time/streams", json={"name": "Client work"})
    ).json()
    created = await async_client.post(
        "/api/v1/plan/goals",
        json={
            "title": "Focused client work",
            "period": "weekly",
            "target_seconds": 72000,
            "stream_id": stream["id"],
        },
    )
    assert created.status_code == 201
    goal = created.json()
    assert goal["period"] == "weekly"
    assert goal["target_seconds"] == 72000

    updated = await async_client.put(
        f"/api/v1/plan/goals/{goal['id']}", json={"target_seconds": 90000}
    )
    assert updated.status_code == 200
    assert updated.json()["target_seconds"] == 90000

    invalid = await async_client.post(
        "/api/v1/plan/goals",
        json={
            "title": "Missing stream",
            "period": "daily",
            "target_seconds": 3600,
            "stream_id": 999999,
        },
    )
    assert invalid.status_code == 404

    deleted = await async_client.delete(f"/api/v1/plan/goals/{goal['id']}")
    assert deleted.status_code == 204


@pytest.mark.asyncio
async def test_metric_goal_crud_and_period_progress(async_client: AsyncClient):
    created = await async_client.post(
        "/api/v1/plan/metric-goals",
        json={
            "title": "  Daily push-ups  ",
            "period": "daily",
            "target_value": 50,
            "direction": "at_least",
        },
    )
    assert created.status_code == 201
    goal = created.json()
    assert goal["title"] == "Daily push-ups"
    assert goal["current_value"] == 0

    first = await async_client.post(
        f"/api/v1/plan/metric-goals/{goal['id']}/progress",
        json={"value": 20, "recorded_on": "2026-09-24"},
    )
    second = await async_client.post(
        f"/api/v1/plan/metric-goals/{goal['id']}/progress",
        json={"value": 15.5, "recorded_on": "2026-09-24"},
    )
    await async_client.post(
        f"/api/v1/plan/metric-goals/{goal['id']}/progress",
        json={"value": 5, "recorded_on": "2026-09-23"},
    )
    assert first.status_code == 201
    assert second.status_code == 201

    daily = await async_client.get(
        "/api/v1/plan/metric-goals",
        params={"on_date": "2026-09-24", "include_inactive": False},
    )
    assert daily.status_code == 200
    assert daily.json()[0]["current_value"] == 35.5

    updated = await async_client.put(
        f"/api/v1/plan/metric-goals/{goal['id']}",
        json={"period": "weekly", "direction": "at_most", "target_value": 100},
    )
    assert updated.status_code == 200
    assert updated.json()["direction"] == "at_most"

    weekly = await async_client.get(
        "/api/v1/plan/metric-goals", params={"on_date": "2026-09-24"}
    )
    assert weekly.json()[0]["current_value"] == 40.5

    history = await async_client.get(
        f"/api/v1/plan/metric-goals/{goal['id']}/progress"
    )
    assert history.status_code == 200
    assert len(history.json()) == 3

    removed = await async_client.delete(
        f"/api/v1/plan/metric-goals/{goal['id']}/progress/{second.json()['id']}"
    )
    assert removed.status_code == 204

    invalid = await async_client.post(
        f"/api/v1/plan/metric-goals/{goal['id']}/progress",
        json={"value": 0, "recorded_on": "2026-09-24"},
    )
    assert invalid.status_code == 422

    exported = (await async_client.get("/api/v1/export/?format=json")).json()
    exported_goal = exported["metric_goals"][0]
    assert exported_goal["id"] == goal["id"]
    assert len(exported_goal["progress_entries"]) == 2

    markdown = await async_client.get("/api/v1/export/?format=markdown")
    assert "## Daily push-ups" in markdown.text
    assert "Type: number" in markdown.text


@pytest.mark.asyncio
async def test_planned_block_crud_and_range_filter(async_client: AsyncClient):
    created = await async_client.post(
        "/api/v1/plan/blocks",
        json={
            "title": "Product work",
            "description": "Calendar intention",
            "starts_at": "2026-09-24T09:00:00+02:00",
            "ends_at": "2026-09-24T10:30:00+02:00",
        },
    )
    assert created.status_code == 201
    block = created.json()

    listed = await async_client.get(
        "/api/v1/plan/blocks",
        params={"from_at": "2026-09-21T00:00:00Z", "to_at": "2026-09-28T00:00:00Z"},
    )
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [block["id"]]

    updated = await async_client.put(
        f"/api/v1/plan/blocks/{block['id']}",
        json={"title": "Product strategy", "ends_at": "2026-09-24T11:00:00+02:00"},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Product strategy"

    invalid = await async_client.post(
        "/api/v1/plan/blocks",
        json={
            "title": "Invalid",
            "starts_at": "2026-09-24T11:00:00Z",
            "ends_at": "2026-09-24T10:00:00Z",
        },
    )
    assert invalid.status_code == 409

    deleted = await async_client.delete(f"/api/v1/plan/blocks/{block['id']}")
    assert deleted.status_code == 204
