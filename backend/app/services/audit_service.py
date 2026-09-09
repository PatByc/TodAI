"""Audit logging service for tracking entity mutations."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditService:
    """Records entity mutations to the audit_log table.

    All mutations (create, update, delete, archive, unarchive) are logged
    with the entity type, ID, action, and optional changes/snapshot data.
    Flushes within the current transaction so the caller controls commit.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def log(
        self,
        entity_type: str,
        entity_id: int,
        action: str,
        changes: dict | None = None,
        snapshot: dict | None = None,
    ) -> AuditLog:
        """Create an audit log entry and flush it within the current transaction.

        Args:
            entity_type: The type of entity (e.g., "note", "task", "idea").
            entity_id: The primary key of the entity.
            action: The mutation action ("create", "update", "delete", "archive", "unarchive").
            changes: Dict of changed fields with old/new values (for updates).
            snapshot: Full entity state at time of action (for creates).

        Returns:
            The created AuditLog record.
        """
        audit_entry = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            changes=changes,
            snapshot=snapshot,
        )
        self.session.add(audit_entry)
        await self.session.flush()
        return audit_entry
