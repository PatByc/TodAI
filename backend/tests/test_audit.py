"""Integration tests verifying INFRA-02 audit logging.

These tests make API calls and then query the audit_log table directly
to verify that AuditLog rows are created for entity mutations.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


@pytest.mark.asyncio
async def test_audit_log_on_note_create(
    async_client: AsyncClient, async_session: AsyncSession
):
    """Create a note via POST, verify audit_log row with action='create'."""
    response = await async_client.post(
        "/api/v1/notes/",
        json={"title": "Audit Create Test"},
    )
    assert response.status_code == 201
    note_id = response.json()["id"]

    # Query audit_log directly
    result = await async_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "note",
            AuditLog.entity_id == note_id,
            AuditLog.action == "create",
        )
    )
    audit_row = result.scalar_one_or_none()
    assert audit_row is not None
    assert audit_row.snapshot is not None
    assert audit_row.snapshot["title"] == "Audit Create Test"


@pytest.mark.asyncio
async def test_audit_log_on_note_update(
    async_client: AsyncClient, async_session: AsyncSession
):
    """Create then update a note, verify audit_log row with action='update' and changes dict."""
    create_resp = await async_client.post(
        "/api/v1/notes/",
        json={"title": "Before Update"},
    )
    note_id = create_resp.json()["id"]

    await async_client.put(
        f"/api/v1/notes/{note_id}",
        json={"title": "After Update"},
    )

    result = await async_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "note",
            AuditLog.entity_id == note_id,
            AuditLog.action == "update",
        )
    )
    audit_row = result.scalar_one_or_none()
    assert audit_row is not None
    assert audit_row.changes is not None
    assert "title" in audit_row.changes
    assert audit_row.changes["title"]["old"] == "Before Update"
    assert audit_row.changes["title"]["new"] == "After Update"


@pytest.mark.asyncio
async def test_audit_log_on_note_archive(
    async_client: AsyncClient, async_session: AsyncSession
):
    """Create then archive a note, verify audit_log row with action='archive'."""
    create_resp = await async_client.post(
        "/api/v1/notes/",
        json={"title": "Archive Audit Test"},
    )
    note_id = create_resp.json()["id"]

    await async_client.patch(f"/api/v1/notes/{note_id}/archive")

    result = await async_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "note",
            AuditLog.entity_id == note_id,
            AuditLog.action == "archive",
        )
    )
    audit_row = result.scalar_one_or_none()
    assert audit_row is not None


@pytest.mark.asyncio
async def test_audit_log_on_task_create(
    async_client: AsyncClient, async_session: AsyncSession
):
    """Create a task via POST, verify audit_log row with entity_type='task', action='create'."""
    response = await async_client.post(
        "/api/v1/tasks/",
        json={"title": "Audit Task Create"},
    )
    assert response.status_code == 201
    task_id = response.json()["id"]

    result = await async_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "task",
            AuditLog.entity_id == task_id,
            AuditLog.action == "create",
        )
    )
    audit_row = result.scalar_one_or_none()
    assert audit_row is not None
    assert audit_row.snapshot is not None
    assert audit_row.snapshot["title"] == "Audit Task Create"


@pytest.mark.asyncio
async def test_audit_log_on_idea_state_change(
    async_client: AsyncClient, async_session: AsyncSession
):
    """Create an idea, update state to 'developing', verify audit_log row with changes."""
    create_resp = await async_client.post(
        "/api/v1/ideas/",
        json={"title": "Idea State Change Audit"},
    )
    idea_id = create_resp.json()["id"]

    await async_client.put(
        f"/api/v1/ideas/{idea_id}",
        json={"state": "developing"},
    )

    result = await async_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "idea",
            AuditLog.entity_id == idea_id,
            AuditLog.action == "update",
        )
    )
    audit_row = result.scalar_one_or_none()
    assert audit_row is not None
    assert audit_row.changes is not None
    assert "state" in audit_row.changes
    assert audit_row.changes["state"]["old"] == "raw"
    assert audit_row.changes["state"]["new"] == "developing"
