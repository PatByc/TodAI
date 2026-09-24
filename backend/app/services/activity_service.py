"""Read models derived from the application audit trail."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.schemas.activity import StateTransitionResponse

STATE_FIELDS = {
    "task": ("status",),
    "note": ("pinned",),
    "idea": ("state",),
}


class ActivityService:
    """Build chronological state transitions from existing audit entries."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_state_transitions(
        self,
        entity_type: str | None = None,
        entity_id: int | None = None,
        limit: int = 30,
    ) -> list[StateTransitionResponse]:
        entity_types = [entity_type] if entity_type else list(STATE_FIELDS)
        statement = select(AuditLog).where(AuditLog.entity_type.in_(entity_types))
        if entity_id is not None:
            statement = statement.where(AuditLog.entity_id == entity_id)
        result = await self.session.execute(
            statement.order_by(AuditLog.created_at, AuditLog.id)
        )
        logs = list(result.scalars().all())
        titles: dict[tuple[str, int], str] = {}
        transitions: list[StateTransitionResponse] = []

        for log in logs:
            key = (log.entity_type, log.entity_id)
            snapshot = log.snapshot or {}
            changes = log.changes or {}
            if log.action == "create" and snapshot.get("title"):
                titles[key] = str(snapshot["title"])
            if "title" in changes and isinstance(changes["title"], dict):
                new_title = changes["title"].get("new")
                if new_title:
                    titles[key] = str(new_title)

            title = titles.get(key, f"{log.entity_type.title()} #{log.entity_id}")
            if log.action == "create":
                state_field = STATE_FIELDS.get(log.entity_type, (None,))[0]
                transitions.append(
                    StateTransitionResponse(
                        id=log.id,
                        entity_type=log.entity_type,
                        entity_id=log.entity_id,
                        entity_title=title,
                        field="created",
                        old_value=None,
                        new_value=snapshot.get(state_field) if state_field else None,
                        created_at=log.created_at,
                    )
                )
            for field in STATE_FIELDS.get(log.entity_type, ()):
                change = changes.get(field)
                if not isinstance(change, dict) or change.get("old") == change.get("new"):
                    continue
                transitions.append(
                    StateTransitionResponse(
                        id=log.id,
                        entity_type=log.entity_type,
                        entity_id=log.entity_id,
                        entity_title=title,
                        field=field,
                        old_value=change.get("old"),
                        new_value=change.get("new"),
                        created_at=log.created_at,
                    )
                )

            if log.action in {"archive", "unarchive"}:
                archived = log.action == "archive"
                transitions.append(
                    StateTransitionResponse(
                        id=log.id,
                        entity_type=log.entity_type,
                        entity_id=log.entity_id,
                        entity_title=title,
                        field="archived",
                        old_value=not archived,
                        new_value=archived,
                        created_at=log.created_at,
                    )
                )

        return list(reversed(transitions[-limit:]))
