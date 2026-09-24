"""Persistence operations for time tracking and configuration."""

from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.time_tracking import TimeCategory, TimeEntry, TimeStream


class TimeConfigurationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_streams(self, include_inactive: bool = True) -> list[TimeStream]:
        query = select(TimeStream).options(selectinload(TimeStream.categories))
        if not include_inactive:
            query = query.where(TimeStream.is_active.is_(True))
        result = await self.session.execute(
            query.order_by(TimeStream.sort_order, TimeStream.id)
        )
        return list(result.scalars().unique().all())

    async def get_stream(self, stream_id: int) -> TimeStream | None:
        result = await self.session.execute(
            select(TimeStream)
            .options(selectinload(TimeStream.categories))
            .where(TimeStream.id == stream_id)
        )
        return result.scalar_one_or_none()

    async def find_stream_name(
        self, name: str, exclude_id: int | None = None
    ) -> TimeStream | None:
        query = select(TimeStream).where(func.lower(TimeStream.name) == name.lower())
        if exclude_id is not None:
            query = query.where(TimeStream.id != exclude_id)
        return (await self.session.execute(query)).scalar_one_or_none()

    async def create_stream(self, data: dict) -> TimeStream:
        max_order = await self.session.scalar(select(func.max(TimeStream.sort_order)))
        stream = TimeStream(sort_order=(max_order or 0) + 1, **data)
        self.session.add(stream)
        await self.session.flush()
        await self.session.refresh(stream)
        return stream

    async def get_category(self, category_id: int) -> TimeCategory | None:
        return await self.session.get(TimeCategory, category_id)

    async def find_category_name(
        self, stream_id: int, name: str, exclude_id: int | None = None
    ) -> TimeCategory | None:
        query = select(TimeCategory).where(
            TimeCategory.stream_id == stream_id,
            func.lower(TimeCategory.name) == name.lower(),
        )
        if exclude_id is not None:
            query = query.where(TimeCategory.id != exclude_id)
        return (await self.session.execute(query)).scalar_one_or_none()

    async def create_category(self, data: dict) -> TimeCategory:
        max_order = await self.session.scalar(
            select(func.max(TimeCategory.sort_order)).where(
                TimeCategory.stream_id == data["stream_id"]
            )
        )
        category = TimeCategory(sort_order=(max_order or 0) + 1, **data)
        self.session.add(category)
        await self.session.flush()
        await self.session.refresh(category)
        return category

    async def get_active_entry(self) -> TimeEntry | None:
        result = await self.session.execute(
            select(TimeEntry)
            .where(TimeEntry.ended_at.is_(None))
            .order_by(TimeEntry.started_at.desc(), TimeEntry.id.desc())
        )
        return result.scalars().first()

    async def list_entries(
        self,
        skip: int = 0,
        limit: int = 100,
        from_at: datetime | None = None,
        to_at: datetime | None = None,
    ) -> list[TimeEntry]:
        query = select(TimeEntry)
        if from_at is not None:
            query = query.where(
                or_(TimeEntry.ended_at.is_(None), TimeEntry.ended_at > from_at)
            )
        if to_at is not None:
            query = query.where(TimeEntry.started_at < to_at)
        result = await self.session.execute(
            query.order_by(TimeEntry.started_at.desc(), TimeEntry.id.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_entry(self, entry_id: int) -> TimeEntry | None:
        return await self.session.get(TimeEntry, entry_id)

    async def create_entry(self, data: dict) -> TimeEntry:
        entry = TimeEntry(**data)
        self.session.add(entry)
        await self.session.flush()
        await self.session.refresh(entry)
        return entry

    async def delete_entry(self, entry: TimeEntry) -> None:
        await self.session.delete(entry)
        await self.session.flush()
