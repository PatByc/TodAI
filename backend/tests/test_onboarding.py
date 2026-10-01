"""First-run onboarding eligibility, persistence, and atomic seeding."""

import asyncio

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.database import TodAISession
from app.models.audit_log import AuditLog
from app.models.project import Project
from app.models.task import Task, TaskStatus
from app.models.workspace_profile import WorkspaceProfile
from app.schemas.onboarding import OnboardingComplete
from app.services.onboarding_service import OnboardingService
from app.services.task_service import TaskService


@pytest.mark.asyncio
async def test_empty_workspace_is_eligible(async_client: AsyncClient):
    response = await async_client.get("/api/v1/onboarding")

    assert response.status_code == 200
    assert response.json() == {
        "current_version": 1,
        "should_show": True,
        "outcome": "pending",
        "display_name": None,
        "starter_project_id": None,
        "starter_task_id": None,
    }


@pytest.mark.asyncio
async def test_populated_workspace_bypasses_onboarding(async_client: AsyncClient):
    await async_client.post("/api/v1/notes/", json={"title": "Existing note"})

    response = await async_client.get("/api/v1/onboarding")

    assert response.json()["should_show"] is False
    assert response.json()["outcome"] == "not_required"


@pytest.mark.asyncio
async def test_skip_is_persisted_and_idempotent(
    async_client: AsyncClient, async_session
):
    first = await async_client.post("/api/v1/onboarding/skip")
    second = await async_client.post("/api/v1/onboarding/skip")

    assert first.json()["outcome"] == "skipped"
    assert second.json()["outcome"] == "skipped"
    assert (
        await async_session.scalar(select(func.count()).select_from(WorkspaceProfile))
        == 1
    )


@pytest.mark.asyncio
async def test_completion_creates_one_linked_starter_set(
    async_client: AsyncClient, async_session
):
    payload = {
        "display_name": "  Ada  ",
        "project_name": "Ship the first version",
        "task_title": "Write the release checklist",
    }
    first = await async_client.post("/api/v1/onboarding/complete", json=payload)
    second = await async_client.post("/api/v1/onboarding/complete", json=payload)

    assert first.status_code == 200
    assert first.json()["outcome"] == "completed"
    assert first.json()["display_name"] == "Ada"
    assert second.json() == first.json()
    assert await async_session.scalar(select(func.count()).select_from(Project)) == 1
    assert await async_session.scalar(select(func.count()).select_from(Task)) == 1

    project = await async_session.scalar(select(Project))
    task = await async_session.scalar(select(Task))
    assert project is not None and task is not None
    assert project.current_focus == task.title
    assert task.project_id == project.id
    assert task.status == TaskStatus.TODO
    assert task.deadline is None
    assert await async_session.scalar(select(func.count()).select_from(AuditLog)) == 2


@pytest.mark.asyncio
async def test_skipped_workspace_can_later_complete(async_client: AsyncClient):
    await async_client.post("/api/v1/onboarding/skip")

    response = await async_client.post(
        "/api/v1/onboarding/complete",
        json={"project_name": "Personal reset", "task_title": "Clear the desk"},
    )

    assert response.json()["outcome"] == "completed"
    assert response.json()["starter_project_id"] is not None


@pytest.mark.asyncio
async def test_profile_update_does_not_complete_onboarding(
    async_client: AsyncClient,
):
    response = await async_client.put(
        "/api/v1/onboarding/profile", json={"display_name": "  Lin  "}
    )

    assert response.json()["display_name"] == "Lin"
    assert response.json()["outcome"] == "pending"
    assert response.json()["should_show"] is True


@pytest.mark.asyncio
async def test_completion_rolls_back_if_task_creation_fails(async_engine, monkeypatch):
    async def fail_create(self, data):
        raise RuntimeError("task write failed")

    monkeypatch.setattr(TaskService, "create", fail_create)

    async with TodAISession(bind=async_engine, expire_on_commit=False) as session:
        with pytest.raises(RuntimeError, match="task write failed"):
            await OnboardingService(session).complete(
                OnboardingComplete(project_name="Atomic", task_title="Must roll back")
            )

        assert await session.scalar(select(func.count()).select_from(Project)) == 0
        assert await session.scalar(select(func.count()).select_from(Task)) == 0
        assert (
            await session.scalar(select(func.count()).select_from(WorkspaceProfile))
            == 0
        )


@pytest.mark.asyncio
async def test_blank_starter_titles_are_rejected(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/onboarding/complete",
        json={"project_name": "   ", "task_title": "A real task"},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_concurrent_completion_does_not_duplicate_starter_data(async_engine):
    data = OnboardingComplete(project_name="One project", task_title="One task")

    async def complete_once():
        async with TodAISession(bind=async_engine, expire_on_commit=False) as session:
            return await OnboardingService(session).complete(data)

    first, second = await asyncio.gather(complete_once(), complete_once())

    assert first.starter_project_id == second.starter_project_id
    assert first.starter_task_id == second.starter_task_id
    async with TodAISession(bind=async_engine, expire_on_commit=False) as session:
        assert await session.scalar(select(func.count()).select_from(Project)) == 1
        assert await session.scalar(select(func.count()).select_from(Task)) == 1
