"""Business rules for time tracking and its configuration."""

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.colors import WORKSPACE_COLOR_COUNT
from app.core.exceptions import EntityNotFoundError, ValidationError
from app.models.project import Project
from app.models.time_tracking import TimeCategory, TimeEntry, TimeStream
from app.repositories.time_tracking_repo import TimeConfigurationRepository
from app.schemas.time_tracking import (
    TimeCategoryCreate,
    TimeCategoryUpdate,
    TimeEntryCreate,
    TimeEntryUpdate,
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
        values.setdefault(
            "color_index", len(await self.repo.list_streams()) % WORKSPACE_COLOR_COUNT
        )
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
            "color_index",
            (stream.color_index + len(stream.categories)) % WORKSPACE_COLOR_COUNT,
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

    async def list_entries(
        self,
        skip: int = 0,
        limit: int = 100,
        from_at: datetime | None = None,
        to_at: datetime | None = None,
    ) -> list[TimeEntry]:
        normalized_from = self._normalize_optional_time(from_at)
        normalized_to = self._normalize_optional_time(to_at)
        if normalized_from and normalized_to and normalized_from >= normalized_to:
            raise ValidationError("The time range end must be after its start")
        return await self.repo.list_entries(
            skip=skip,
            limit=limit,
            from_at=normalized_from,
            to_at=normalized_to,
        )

    async def create_entry(self, data: TimeEntryCreate) -> TimeEntry:
        values = data.model_dump()
        await self._validate_entry_references(values, require_active=True)
        self._normalize_entry_times(values)
        entry = await self.repo.create_entry(values)
        await self.audit.log(
            "time_entry", entry.id, "create", snapshot=self._audit_values(values)
        )
        await self.session.commit()
        await self.session.refresh(entry)
        return entry

    async def update_entry(self, entry_id: int, data: TimeEntryUpdate) -> TimeEntry:
        entry = await self._require_entry(entry_id)
        if entry.ended_at is None:
            raise ValidationError("Stop the running timer before editing it")
        values = data.model_dump(exclude_unset=True)
        if not values:
            return entry

        merged = {
            "started_at": values.get("started_at", entry.started_at),
            "ended_at": values.get("ended_at", entry.ended_at),
            "stream_id": values.get("stream_id", entry.stream_id),
            "category_id": values.get("category_id", entry.category_id),
            "project_id": values.get("project_id", entry.project_id),
            "notes": values.get("notes", entry.notes),
        }
        await self._validate_entry_references(merged, require_active=False)
        self._normalize_entry_times(merged)

        changes = {}
        for field, value in merged.items():
            previous = getattr(entry, field)
            if previous != value:
                changes[field] = {
                    "old": self._audit_value(previous),
                    "new": self._audit_value(value),
                }
                setattr(entry, field, value)

        if changes:
            await self.audit.log("time_entry", entry.id, "update", changes=changes)
            await self.session.commit()
            await self.session.refresh(entry)
        return entry

    async def delete_entry(self, entry_id: int) -> None:
        entry = await self._require_entry(entry_id)
        if entry.ended_at is None:
            raise ValidationError("Stop the running timer before deleting it")
        await self.repo.delete_entry(entry)
        await self.audit.log("time_entry", entry_id, "delete")
        await self.session.commit()

    async def start_timer(self, data: TimerStart) -> TimeEntry:
        if await self.repo.get_active_entry() is not None:
            raise ValidationError("A timer is already running")

        values = data.model_dump(exclude_none=True)
        await self._validate_entry_references(values, require_active=True)
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

    async def _require_entry(self, entry_id: int) -> TimeEntry:
        entry = await self.repo.get_entry(entry_id)
        if entry is None:
            raise EntityNotFoundError("time_entry", entry_id)
        return entry

    async def _validate_entry_references(
        self, values: dict, *, require_active: bool
    ) -> None:
        stream_id = values.get("stream_id")
        category_id = values.get("category_id")
        if stream_id is not None:
            stream = await self._require_stream(stream_id)
            if require_active and not stream.is_active:
                raise ValidationError("The selected time stream is inactive")

        if category_id is not None:
            category = await self.repo.get_category(category_id)
            if category is None:
                raise EntityNotFoundError("time_category", category_id)
            if require_active and not category.is_active:
                raise ValidationError("The selected time category is inactive")
            if stream_id is None:
                values["stream_id"] = category.stream_id
            elif category.stream_id != stream_id:
                raise ValidationError(
                    "The selected category does not belong to the stream"
                )

        project_id = values.get("project_id")
        if (
            project_id is not None
            and await self.session.get(Project, project_id) is None
        ):
            raise EntityNotFoundError("project", project_id)

    @staticmethod
    def _normalize_entry_times(values: dict) -> None:
        for field in ("started_at", "ended_at"):
            value = values.get(field)
            if value is None:
                raise ValidationError("Time entries need both a start and an end")
            if value.tzinfo is not None:
                values[field] = value.astimezone(UTC).replace(tzinfo=None)
        if values["ended_at"] <= values["started_at"]:
            raise ValidationError("End time must be after start time")
        values["duration_seconds"] = int(
            (values["ended_at"] - values["started_at"]).total_seconds()
        )

    @staticmethod
    def _normalize_optional_time(value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is not None:
            return value.astimezone(UTC).replace(tzinfo=None)
        return value

    @staticmethod
    def _audit_value(value):
        return value.isoformat() if isinstance(value, datetime) else value

    @classmethod
    def _audit_values(cls, values: dict) -> dict:
        return {key: cls._audit_value(value) for key, value in values.items()}

    @staticmethod
    def _apply_changes(entity, values: dict) -> dict:
        changes = {}
        for field, value in values.items():
            previous = getattr(entity, field)
            if previous != value:
                changes[field] = {"old": previous, "new": value}
                setattr(entity, field, value)
        return changes
