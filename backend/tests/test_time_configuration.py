"""Integration tests for configurable time streams and categories."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.audit_log import AuditLog
from app.models.time_tracking import TimeEntry


@pytest.mark.asyncio
async def test_create_and_configure_time_stream(
    async_client: AsyncClient, async_session
):
    stream_response = await async_client.post(
        "/api/v1/time/streams", json={"name": "  Client   work  "}
    )
    assert stream_response.status_code == 201
    stream = stream_response.json()
    assert stream["name"] == "Client work"
    assert stream["is_active"] is True
    assert stream["categories"] == []

    color_response = await async_client.put(
        f"/api/v1/time/streams/{stream['id']}",
        json={"color_index": 7},
    )
    assert color_response.status_code == 200
    assert color_response.json()["color_index"] == 7

    category_response = await async_client.post(
        "/api/v1/time/categories",
        json={"stream_id": stream["id"], "name": "Development"},
    )
    assert category_response.status_code == 201
    category = category_response.json()
    assert category["stream_id"] == stream["id"]
    assert category["name"] == "Development"

    streams_response = await async_client.get("/api/v1/time/streams")
    assert streams_response.status_code == 200
    listed = streams_response.json()
    assert listed[0]["categories"][0]["name"] == "Development"

    update_response = await async_client.put(
        f"/api/v1/time/categories/{category['id']}",
        json={"is_active": False},
    )
    assert update_response.status_code == 200
    assert update_response.json()["is_active"] is False

    audit_rows = list(
        (
            await async_session.execute(
                select(AuditLog)
                .where(AuditLog.entity_type.in_(["time_stream", "time_category"]))
                .order_by(AuditLog.id)
            )
        ).scalars()
    )
    assert [row.action for row in audit_rows] == [
        "create",
        "update",
        "create",
        "update",
    ]


@pytest.mark.asyncio
async def test_time_configuration_rejects_duplicate_names(async_client: AsyncClient):
    created = await async_client.post("/api/v1/time/streams", json={"name": "Focus"})
    assert created.status_code == 201

    duplicate = await async_client.post("/api/v1/time/streams", json={"name": "focus"})
    assert duplicate.status_code == 409
    assert "already exists" in duplicate.json()["detail"]

    stream_id = created.json()["id"]
    first_category = await async_client.post(
        "/api/v1/time/categories",
        json={"stream_id": stream_id, "name": "Writing"},
    )
    assert first_category.status_code == 201
    duplicate_category = await async_client.post(
        "/api/v1/time/categories",
        json={"stream_id": stream_id, "name": "writing"},
    )
    assert duplicate_category.status_code == 409


@pytest.mark.asyncio
async def test_category_requires_existing_stream(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/time/categories",
        json={"stream_id": 999_999, "name": "Nowhere"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_time_configuration_is_included_in_json_export(
    async_client: AsyncClient,
):
    stream = (
        await async_client.post(
            "/api/v1/time/streams", json={"name": "Exported stream"}
        )
    ).json()
    await async_client.post(
        "/api/v1/time/categories",
        json={"stream_id": stream["id"], "name": "Exported category"},
    )

    export_response = await async_client.get("/api/v1/export/?format=json")
    assert export_response.status_code == 200
    payload = export_response.json()
    assert payload["time_streams"][0]["name"] == "Exported stream"
    assert payload["time_streams"][0]["categories"][0]["name"] == "Exported category"


@pytest.mark.asyncio
async def test_active_timer_persists_and_stops_as_time_entry(
    async_client: AsyncClient, async_session
):
    empty = await async_client.get("/api/v1/time/timer")
    assert empty.status_code == 200
    assert empty.json() is None

    started = await async_client.post("/api/v1/time/timer/start", json={})
    assert started.status_code == 201
    active = started.json()
    assert active["ended_at"] is None
    assert active["duration_seconds"] is None

    restored = await async_client.get("/api/v1/time/timer")
    assert restored.status_code == 200
    assert restored.json()["id"] == active["id"]

    duplicate = await async_client.post("/api/v1/time/timer/start", json={})
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "A timer is already running"

    stopped = await async_client.post("/api/v1/time/timer/stop")
    assert stopped.status_code == 200
    assert stopped.json()["ended_at"] is not None
    assert stopped.json()["duration_seconds"] >= 0

    assert (await async_client.get("/api/v1/time/timer")).json() is None
    entry = await async_session.get(TimeEntry, active["id"])
    assert entry is not None
    assert entry.ended_at is not None

    audit_rows = list(
        (
            await async_session.execute(
                select(AuditLog)
                .where(AuditLog.entity_type == "time_entry")
                .order_by(AuditLog.id)
            )
        ).scalars()
    )
    assert [row.action for row in audit_rows] == ["start", "stop"]


@pytest.mark.asyncio
async def test_stopping_without_active_timer_is_rejected(async_client: AsyncClient):
    response = await async_client.post("/api/v1/time/timer/stop")
    assert response.status_code == 409
    assert response.json()["detail"] == "No timer is running"


@pytest.mark.asyncio
async def test_manual_time_entry_crud_and_reference_validation(
    async_client: AsyncClient, async_session
):
    stream = (
        await async_client.post("/api/v1/time/streams", json={"name": "Deep work"})
    ).json()
    category = (
        await async_client.post(
            "/api/v1/time/categories",
            json={"stream_id": stream["id"], "name": "Coding"},
        )
    ).json()
    created = await async_client.post(
        "/api/v1/time/entries",
        json={
            "started_at": "2026-09-24T08:00:00Z",
            "ended_at": "2026-09-24T09:30:00Z",
            "category_id": category["id"],
            "notes": "Release work",
        },
    )
    assert created.status_code == 201
    entry = created.json()
    assert entry["stream_id"] == stream["id"]
    assert entry["category_id"] == category["id"]
    assert entry["duration_seconds"] == 5400

    listed = await async_client.get("/api/v1/time/entries")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [entry["id"]]

    updated = await async_client.put(
        f"/api/v1/time/entries/{entry['id']}",
        json={"ended_at": "2026-09-24T10:00:00Z", "notes": "Release complete"},
    )
    assert updated.status_code == 200
    assert updated.json()["duration_seconds"] == 7200
    assert updated.json()["notes"] == "Release complete"

    invalid = await async_client.post(
        "/api/v1/time/entries",
        json={
            "started_at": "2026-09-24T10:00:00Z",
            "ended_at": "2026-09-24T09:00:00Z",
        },
    )
    assert invalid.status_code == 409
    assert invalid.json()["detail"] == "End time must be after start time"

    deleted = await async_client.delete(f"/api/v1/time/entries/{entry['id']}")
    assert deleted.status_code == 204
    assert await async_session.get(TimeEntry, entry["id"]) is None

    audit_rows = list(
        (
            await async_session.execute(
                select(AuditLog)
                .where(
                    AuditLog.entity_type == "time_entry",
                    AuditLog.entity_id == entry["id"],
                )
                .order_by(AuditLog.id)
            )
        ).scalars()
    )
    assert [row.action for row in audit_rows] == ["create", "update", "delete"]
