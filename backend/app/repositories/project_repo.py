"""Project repository with CRUD operations."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    """Repository for Project entities."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Project, session)
