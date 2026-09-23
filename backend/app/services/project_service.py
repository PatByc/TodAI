"""Project service layer wrapping repository and audit logging."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.core.text_utils import extract_plain_text
from app.models.project import Project
from app.repositories.project_repo import ProjectRepository
from app.repositories.tag_repo import TagRepository
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.audit_service import AuditService


class ProjectService:
    """Service for Project entity operations with audit logging."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ProjectRepository(session)
        self.tag_repo = TagRepository(session)
        self.audit = AuditService(session)

    async def create(self, data: ProjectCreate) -> Project:
        """Create a new project and log the creation to audit.

        Extracts description_text from Tiptap JSON description content.
        """
        create_data = data.model_dump()

        # Extract plain text from Tiptap JSON description
        if create_data.get("description"):
            create_data["description_text"] = extract_plain_text(
                create_data["description"]
            ).strip()

        project = await self.repo.create(create_data)
        await self.audit.log(
            entity_type="project",
            entity_id=project.id,
            action="create",
            snapshot={
                "name": project.name,
                "description": project.description,
                "goals": project.goals,
                "current_focus": project.current_focus,
                "status": project.status.value if project.status else None,
            },
        )
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def get(self, project_id: int) -> Project:
        """Get a project by ID. Raises EntityNotFoundError if not found."""
        project = await self.repo.get_by_id(project_id)
        if project is None:
            raise EntityNotFoundError("project", project_id)
        return project

    async def list(
        self,
        skip: int = 0,
        limit: int = 50,
        include_archived: bool = False,
        tag_ids: list[int] | None = None,
        tag_logic: str = "or",
    ) -> tuple[list[Project], int]:
        """List projects with pagination and optional tag filtering."""
        if tag_ids:
            entity_ids = await self.tag_repo.get_entities_by_tags(
                entity_type="project",
                tag_ids=tag_ids,
                logic=tag_logic,
            )
            if not entity_ids:
                return [], 0
        else:
            entity_ids = None
        return await self.repo.list_all(
            skip=skip,
            limit=limit,
            include_archived=include_archived,
            entity_ids=entity_ids,
        )

    async def update(self, project_id: int, data: ProjectUpdate) -> Project:
        """Update a project and log changes to audit.

        Re-extracts description_text if description is updated.
        """
        existing = await self.get(project_id)

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return existing

        # Re-extract description_text when description changes
        if "description" in update_data:
            description = update_data["description"]
            update_data["description_text"] = (
                extract_plain_text(description).strip() if description else None
            )

        # Compute changes dict (old vs new for modified fields only)
        changes = {}
        for field, new_value in update_data.items():
            old_value = getattr(existing, field)
            # Serialize non-JSON-safe types
            old_serialized = (
                old_value.value if hasattr(old_value, "value") else old_value
            )
            new_serialized = (
                new_value.value if hasattr(new_value, "value") else new_value
            )
            if hasattr(old_serialized, "isoformat"):
                old_serialized = old_serialized.isoformat()
            if hasattr(new_serialized, "isoformat"):
                new_serialized = new_serialized.isoformat()
            if old_serialized != new_serialized:
                changes[field] = {"old": old_serialized, "new": new_serialized}

        project = await self.repo.update(project_id, update_data)
        if project is None:
            raise EntityNotFoundError("project", project_id)

        if changes:
            await self.audit.log(
                entity_type="project",
                entity_id=project_id,
                action="update",
                changes=changes,
            )
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def delete(self, project_id: int) -> None:
        """Delete a project and log the deletion to audit."""
        await self.get(project_id)  # Verify exists
        await self.repo.delete(project_id)
        await self.audit.log(
            entity_type="project",
            entity_id=project_id,
            action="delete",
        )
        await self.session.commit()

    async def archive(self, project_id: int) -> Project:
        """Archive a project and log the action to audit."""
        project = await self.repo.archive(project_id)
        if project is None:
            raise EntityNotFoundError("project", project_id)
        await self.audit.log(
            entity_type="project",
            entity_id=project_id,
            action="archive",
        )
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def unarchive(self, project_id: int) -> Project:
        """Unarchive a project and log the action to audit."""
        project = await self.repo.unarchive(project_id)
        if project is None:
            raise EntityNotFoundError("project", project_id)
        await self.audit.log(
            entity_type="project",
            entity_id=project_id,
            action="unarchive",
        )
        await self.session.commit()
        await self.session.refresh(project)
        return project
