"""Integration tests for configurable time streams and categories."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.audit_log import AuditLog


@pytest.mark.asyncio
async def test_create_and_configure_time_stream(async_client: AsyncClient, async_session):
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
                select(AuditLog).where(
                    AuditLog.entity_type.in_(["time_stream", "time_category"])
                ).order_by(AuditLog.id)
            )
        ).scalars()
    )
    assert [row.action for row in audit_rows] == ["create", "update", "create", "update"]


@pytest.mark.asyncio
async def test_time_configuration_rejects_duplicate_names(async_client: AsyncClient):
    created = await async_client.post(
        "/api/v1/time/streams", json={"name": "Focus"}
    )
    assert created.status_code == 201

    duplicate = await async_client.post(
        "/api/v1/time/streams", json={"name": "focus"}
    )
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
