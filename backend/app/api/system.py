"""System utility API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.models.idea import Idea
from app.models.note import Note
from app.models.task import Task

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/counts")
async def get_counts(
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Return counts of non-archived entities.

    Uses three separate COUNT queries per RESEARCH Pitfall 3 --
    simple and performant for sidebar display.
    """
    note_count = await session.execute(
        select(func.count()).select_from(Note).where(Note.archived_at.is_(None))
    )
    task_count = await session.execute(
        select(func.count()).select_from(Task).where(Task.archived_at.is_(None))
    )
    idea_count = await session.execute(
        select(func.count()).select_from(Idea).where(Idea.archived_at.is_(None))
    )

    return {
        "notes": note_count.scalar_one(),
        "tasks": task_count.scalar_one(),
        "ideas": idea_count.scalar_one(),
    }
