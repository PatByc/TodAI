"""Business rules for time tracking and its configuration."""

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError, ValidationError
from app.models.time_tracking import TimeCategory, TimeEntry, TimeStream
from app.repositories.time_tracking_repo import TimeConfigurationRepository
from app.schemas.time_tracking import (
    TimeCategoryCreate,
    TimeCategoryUpdate,
    TimerStart,
    TimeStreamCreate,
    TimeStreamUpdate,
)
from app.services.audit_service import AuditService


class TimeConfigurationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = TimeConfigurationRepository(session)
        self.audit = AuditService(session)

    async def list_streams(self, include_inactive: bool = True) -> list[TimeStream]:
        return await self.repo.list_streams(include_inactive)

    async def create_stream(self, data: TimeStreamCreate) -> TimeStream:
        if await self.repo.find_stream_name(data.name):
            raise ValidationError(f"A time stream named '{data.name}' already exists")
        values = data.model_dump(exclude_none=True)
        values.setdefault("color_index", len(await self.repo.list_streams()) % 12)
        stream = await self.repo.create_stream(values)
        await self.audit.log("time_stream", stream.id, "create", snapshot=values)
        await self.session.commit()
        return await self._require_stream(stream.id)

    async def update_stream(self, stream_id: int, data: TimeStreamUpdate) -> TimeStream:
        stream = await self._require_stream(stream_id)
        values = data.model_dump(exclude_unset=True)
        if "name" in values and await self.repo.find_stream_name(
            values["name"], exclude_id=stream_id
        ):
            raise ValidationError(
                f"A time stream named '{values['name']}' already exists"
            )
        changes = self._apply_changes(stream, values)
        if changes:
            await self.audit.log("time_stream", stream.id, "update", changes=changes)
            await self.session.commit()
        return await self._require_stream(stream_id)

    async def create_category(self, data: TimeCategoryCreate) -> TimeCategory:
        await self._require_stream(data.stream_id)
        if await self.repo.find_category_name(data.stream_id, data.name):
            raise ValidationError(
                f"A category named '{data.name}' already exists in this stream"
            )
        values = data.model_dump(exclude_none=True)
        stream = await self._require_stream(data.stream_id)
        values.setdefault(
            "color_index", (stream.color_index + len(stream.categories)) % 12
        )
        category = await self.repo.create_category(values)
        await self.audit.log("time_category", category.id, "create", snapshot=values)
        await self.session.commit()
        await self.session.refresh(category)
        return category

    async def update_category(
        self, category_id: int, data: TimeCategoryUpdate
    ) -> TimeCategory:
        category = await self.repo.get_category(category_id)
        if category is None:
            raise EntityNotFoundError("time_category", category_id)
        values = data.model_dump(exclude_unset=True)
        target_stream_id = values.get("stream_id", category.stream_id)
        await self._require_stream(target_stream_id)
        target_name = values.get("name", category.name)
        if await self.repo.find_category_name(
            target_stream_id, target_name, exclude_id=category_id
        ):
            raise ValidationError(
                f"A category named '{target_name}' already exists in this stream"
            )
        changes = self._apply_changes(category, values)
        if changes:
            await self.audit.log(
                "time_category", category.id, "update", changes=changes
            )
            await self.session.commit()
        await self.session.refresh(category)
        return category

    async def get_active_timer(self) -> TimeEntry | None:
        return await self.repo.get_active_entry()

    async def start_timer(self, data: TimerStart) -> TimeEntry:
        if await self.repo.get_active_entry() is not None:
            raise ValidationError("A timer is already running")

        if data.stream_id is not None:
            stream = await self._require_stream(data.stream_id)
            if not stream.is_active:
                raise ValidationError("The selected time stream is inactive")

        if data.category_id is not None:
            category = await self.repo.get_category(data.category_id)
            if category is None:
                raise EntityNotFoundError("time_category", data.category_id)
            if not category.is_active:
                raise ValidationError("The selected time category is inactive")
            if data.stream_id is not None and category.stream_id != data.stream_id:
                raise ValidationError(
                    "The selected category does not belong to the stream"
                )

        values = data.model_dump(exclude_none=True)
        values["started_at"] = datetime.now(UTC).replace(tzinfo=None)
        entry = await self.repo.create_entry(values)
        snapshot = {**values, "started_at": values["started_at"].isoformat()}
        await self.audit.log("time_entry", entry.id, "start", snapshot=snapshot)
        await self.session.commit()
        await self.session.refresh(entry)
        return entry

    async def stop_timer(self) -> TimeEntry:
        entry = await self.repo.get_active_entry()
        if entry is None:
            raise ValidationError("No timer is running")

        ended_at = datetime.now(UTC).replace(tzinfo=None)
        entry.ended_at = ended_at
        entry.duration_seconds = max(
            0, int((ended_at - entry.started_at).total_seconds())
        )
        await self.audit.log(
            "time_entry",
            entry.id,
            "stop",
            changes={
                "ended_at": {"old": None, "new": ended_at.isoformat()},
                "duration_seconds": {"old": None, "new": entry.duration_seconds},
            },
        )
        await self.session.commit()
        await self.session.refresh(entry)
        return entry

    async def _require_stream(self, stream_id: int) -> TimeStream:
        stream = await self.repo.get_stream(stream_id)
        if stream is None:
            raise EntityNotFoundError("time_stream", stream_id)
        return stream

    @staticmethod
    def _apply_changes(entity, values: dict) -> dict:
        changes = {}
        for field, value in values.items():
            previous = getattr(entity, field)
            if previous != value:
                changes[field] = {"old": previous, "new": value}
                setattr(entity, field, value)
        return changes
