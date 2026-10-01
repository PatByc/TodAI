"""Deterministic, offline-safe onboarding orchestration."""

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.idea import Idea
from app.models.inbox_item import InboxItem
from app.models.note import Note
from app.models.planning import MetricGoal, PlannedBlock, Routine, TimeGoal
from app.models.project import Project
from app.models.review_reflection import ReviewReflection
from app.models.tag import Tag
from app.models.task import Task
from app.models.time_tracking import TimeEntry
from app.models.workspace_profile import WorkspaceProfile
from app.schemas.common import TaskStatus
from app.schemas.onboarding import (
    OnboardingComplete,
    OnboardingState,
    WorkspaceProfileUpdate,
)
from app.schemas.project import ProjectCreate
from app.schemas.task import TaskCreate
from app.services.project_service import ProjectService
from app.services.task_service import TaskService

CURRENT_ONBOARDING_VERSION = 1
_CONTENT_MODELS = (
    Note,
    Task,
    Idea,
    Project,
    InboxItem,
    Tag,
    Routine,
    TimeGoal,
    MetricGoal,
    PlannedBlock,
    TimeEntry,
    ReviewReflection,
)


class OnboardingService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _has_workspace_content(self) -> bool:
        for model in _CONTENT_MODELS:
            count = await self.session.scalar(select(func.count()).select_from(model))
            if count:
                return True
        return False

    async def _profile(self, *, for_update: bool = False) -> WorkspaceProfile | None:
        statement = select(WorkspaceProfile).where(WorkspaceProfile.id == 1)
        if for_update:
            statement = statement.with_for_update()
        return await self.session.scalar(statement)

    async def _locked_profile(self) -> WorkspaceProfile:
        profile = await self._profile(for_update=True)
        if profile is None:
            profile = WorkspaceProfile(id=1)
            self.session.add(profile)
            await self.session.flush()
        return profile

    async def state(self) -> OnboardingState:
        profile = await self._profile()
        if profile and profile.onboarding_outcome in {"completed", "skipped"}:
            outcome = profile.onboarding_outcome
            should_show = False
        elif await self._has_workspace_content():
            outcome = "not_required"
            should_show = False
        else:
            outcome = "pending"
            should_show = True
        return OnboardingState(
            current_version=CURRENT_ONBOARDING_VERSION,
            should_show=should_show,
            outcome=outcome,
            display_name=profile.display_name if profile else None,
            starter_project_id=profile.starter_project_id if profile else None,
            starter_task_id=profile.starter_task_id if profile else None,
        )

    async def complete(self, data: OnboardingComplete) -> OnboardingState:
        existing = await self._profile()
        if existing and existing.onboarding_outcome == "completed":
            return await self.state()

        try:
            async with self.session.atomic_batch():  # type: ignore[attr-defined]
                profile = await self._locked_profile()
                if profile.onboarding_outcome == "completed":
                    return await self.state()

                project = await ProjectService(self.session).create(
                    ProjectCreate(
                        name=data.project_name,
                        current_focus=data.task_title,
                    )
                )
                task = await TaskService(self.session).create(
                    TaskCreate(
                        title=data.task_title,
                        project_id=project.id,
                        status=TaskStatus.TODO,
                    )
                )
                profile.display_name = data.display_name
                profile.onboarding_version = CURRENT_ONBOARDING_VERSION
                profile.onboarding_outcome = "completed"
                profile.starter_project_id = project.id
                profile.starter_task_id = task.id
                profile.completed_at = datetime.now(UTC).replace(tzinfo=None)
                profile.skipped_at = None
                await self.session.flush()
        except IntegrityError:
            await self.session.rollback()
            winner = await self._profile()
            if winner and winner.onboarding_outcome == "completed":
                return await self.state()
            if winner is None:
                raise
            return await self.complete(data)
        return await self.state()

    async def skip(self) -> OnboardingState:
        try:
            async with self.session.atomic_batch():  # type: ignore[attr-defined]
                profile = await self._locked_profile()
                if profile.onboarding_outcome == "completed":
                    return await self.state()
                profile.onboarding_version = CURRENT_ONBOARDING_VERSION
                profile.onboarding_outcome = "skipped"
                profile.skipped_at = datetime.now(UTC).replace(tzinfo=None)
                await self.session.flush()
        except IntegrityError:
            await self.session.rollback()
            if await self._profile() is None:
                raise
            return await self.skip()
        return await self.state()

    async def update_profile(self, data: WorkspaceProfileUpdate) -> OnboardingState:
        try:
            async with self.session.atomic_batch():  # type: ignore[attr-defined]
                profile = await self._locked_profile()
                profile.display_name = data.display_name
        except IntegrityError:
            await self.session.rollback()
            if await self._profile() is None:
                raise
            return await self.update_profile(data)
        return await self.state()
