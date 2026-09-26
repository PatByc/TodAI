"""Review-first Agent mode over TodAI's existing application services."""

import hashlib
import json
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from fastapi import HTTPException
from mcp import Client
from openai import AuthenticationError
from pydantic import ValidationError
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.agent_proposal import AgentProposal
from app.models.idea import Idea
from app.models.inbox_item import InboxItem
from app.models.note import Note
from app.models.project import Project
from app.models.tag import Tag
from app.models.task import Task
from app.providers.agent_provider import (
    ActionPlanner,
    AgentPlanResult,
    OpenAIActionPlanner,
)
from app.repositories.tag_repo import TagRepository
from app.schemas.agent import (
    AgentAction,
    AgentApplyResponse,
    AgentApplyResult,
    AgentPlanRequest,
    AgentPlanResponse,
    AgentStatus,
)
from app.schemas.idea import IdeaCreate, IdeaUpdate
from app.schemas.inbox import InboxItemCreate
from app.schemas.note import NoteCreate, NoteUpdate
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.agent_mcp import TodMCP, mcp_result_json, tool_call_to_action
from app.services.audit_service import AuditService
from app.services.context_compression import prepare_history
from app.services.conversion_service import ConversionService
from app.services.idea_service import IdeaService
from app.services.inbox_service import InboxService
from app.services.note_service import NoteService
from app.services.project_service import ProjectService
from app.services.search_index_service import SearchIndexService
from app.services.task_service import TaskService

EventEmitter = Callable[[str, dict[str, Any]], Awaitable[None]]

_MODELS = {
    "note": Note,
    "task": Task,
    "idea": Idea,
    "project": Project,
    "inbox_item": InboxItem,
}
_CREATE_SCHEMAS = {
    "note": NoteCreate,
    "task": TaskCreate,
    "idea": IdeaCreate,
    "project": ProjectCreate,
    "inbox_item": InboxItemCreate,
}
_UPDATE_SCHEMAS = {
    "note": NoteUpdate,
    "task": TaskUpdate,
    "idea": IdeaUpdate,
    "project": ProjectUpdate,
}
_CREATE_FIELDS = {
    "note": {"title", "content", "project_id"},
    "task": {
        "title",
        "description",
        "priority",
        "urgency",
        "progress",
        "status",
        "deadline",
        "project_id",
        "recurrence_unit",
        "recurrence_interval",
        "recurrence_end_date",
        "recurrence_limit",
    },
    "idea": {"title", "content", "state", "project_id"},
    "project": {"name", "description", "goals", "current_focus"},
    "inbox_item": {"content"},
}
_UPDATE_FIELDS = {
    "note": {"title", "content", "pinned", "project_id"},
    "task": {
        "title",
        "description",
        "priority",
        "urgency",
        "progress",
        "status",
        "deadline",
        "project_id",
        "recurrence_unit",
        "recurrence_interval",
        "recurrence_end_date",
        "recurrence_limit",
    },
    "idea": {"title", "content", "state", "project_id"},
    "project": {"name", "description", "goals", "current_focus", "status"},
}
_URL_PREFIX = {
    "note": "notes",
    "task": "tasks",
    "idea": "ideas",
    "project": "projects",
    "inbox_item": "inbox",
}


def agent_status() -> AgentStatus:
    if settings.completion_provider != "openai":
        return AgentStatus(
            available=False,
            reason="Set COMPLETION_PROVIDER=openai to enable Tod.",
        )
    if not settings.openai_api_key:
        return AgentStatus(
            available=False,
            reason="Add OPENAI_API_KEY to your local .env file to enable Tod.",
        )
    return AgentStatus(available=True)


async def recover_agent_proposals(session: AsyncSession) -> None:
    """Close proposals that could not survive a process restart or expiration."""
    now = datetime.now(UTC).replace(tzinfo=None)
    await session.execute(
        update(AgentProposal)
        .where(AgentProposal.status == "pending", AgentProposal.expires_at <= now)
        .values(status="expired", completed_at=now)
    )
    await session.execute(
        update(AgentProposal)
        .where(AgentProposal.status == "applying")
        .values(
            status="failed",
            failure_reason="Tod restarted before this batch completed. No partial batch is kept.",
            completed_at=now,
        )
    )
    await session.commit()


def _rich_text(value: str) -> dict:
    return {
        "type": "doc",
        "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": value}]}
        ],
    }


def _entity_fingerprint(entity) -> str:
    values = {
        column.name: getattr(entity, column.name) for column in entity.__table__.columns
    }
    serialized = json.dumps(values, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode()).hexdigest()


class AgentService:
    def __init__(
        self,
        session: AsyncSession,
        planner: ActionPlanner | None = None,
        emit: EventEmitter | None = None,
    ) -> None:
        self.session = session
        self.emit = emit
        self.mcp = TodMCP(session)
        self.planner = planner or (
            OpenAIActionPlanner(
                settings.openai_api_key,
                settings.completion_model,
                self.mcp,
                emit,
                usage_session=session,
            )
            if settings.completion_provider == "openai" and settings.openai_api_key
            else None
        )
        self.search = SearchIndexService(session)
        self.read_ids: set[tuple[str, int]] = set()

    async def _read_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        if name == "search_records":
            query = arguments.get("query")
            if not isinstance(query, str) or not query.strip() or len(query) > 500:
                return {"error": "Search query must be 1–500 characters."}
            found = await self.search.search(query, mode="hybrid", limit=10)
            self.read_ids.update(
                (item.entity_type, item.entity_id) for item in found.results
            )
            return {
                "results": [
                    {
                        "entity_type": item.entity_type,
                        "entity_id": item.entity_id,
                        "title": item.title,
                        "snippet": item.snippet[:700],
                        "url": item.url,
                    }
                    for item in found.results
                ]
            }
        if name == "read_record":
            kind, entity_id = arguments.get("entity_type"), arguments.get("entity_id")
            if kind not in _MODELS or type(entity_id) is not int or entity_id <= 0:
                return {"error": "Invalid record type or ID."}
            if (kind, entity_id) not in self.read_ids:
                return {"error": "Search for this record before reading it."}
            entity = await self.session.get(_MODELS[kind], entity_id)
            if entity is None:
                return {"error": "Record no longer exists."}
            fields = {
                column.name: getattr(entity, column.name)
                for column in entity.__table__.columns
            }
            fields.pop("content", None)
            if kind == "project":
                fields.pop("description", None)
            if kind == "inbox_item" and not fields.get("content_text"):
                fields["content_text"] = str(entity.content)[:8000]
            for key, value in fields.items():
                if isinstance(value, datetime):
                    fields[key] = value.isoformat()
                elif isinstance(value, str):
                    fields[key] = value[:8000]
                elif hasattr(value, "value"):
                    fields[key] = value.value
            return {"entity_type": kind, "entity_id": entity_id, "fields": fields}
        return {"error": "Unknown read tool."}

    async def plan(self, request: AgentPlanRequest) -> AgentPlanResponse:
        if self.planner is None:
            raise HTTPException(
                status_code=503, detail="Configure OPENAI_API_KEY to use Agent mode."
            )
        query = request.question.strip()
        history = await prepare_history(request.history, query)
        try:
            planned = await self.planner.propose(query, history)
            if isinstance(planned, tuple):
                # Compatibility for locally supplied planners while callers migrate.
                message, legacy_actions = planned
                planned = AgentPlanResult(message=message)
                actions = legacy_actions
                exact_calls: list[dict[str, Any]] = []
            else:
                actions = [
                    AgentAction.model_validate(
                        tool_call_to_action(call.name, call.arguments)
                    )
                    for call in planned.calls
                ]
                exact_calls = [
                    {"tool_name": call.name, "arguments": call.arguments}
                    for call in planned.calls
                ]
        except AuthenticationError as exc:
            raise HTTPException(
                status_code=502,
                detail="OpenAI rejected the configured API key. Update OPENAI_API_KEY and restart TodAI.",
            ) from exc
        except (ValueError, KeyError, ValidationError) as exc:
            raise HTTPException(
                status_code=502,
                detail="The AI returned an invalid action proposal. Try again.",
            ) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail="The AI provider could not plan this request. Try again.",
            ) from exc

        if not actions:
            return AgentPlanResponse(
                message=planned.message or "No change proposed.",
                sources=planned.sources,
            )
        if len(actions) > 8:
            raise HTTPException(
                status_code=422,
                detail="An Agent proposal may contain at most eight actions.",
            )
        targets: set[tuple[str, int]] = set()
        stored_actions: list[dict] = []
        actions = [self._normalize_action(action) for action in actions]
        for index, action in enumerate(actions):
            await self._validate_action(action, self.mcp.read_ids or None)
            stored = action.model_dump(mode="json")
            if exact_calls:
                stored.update(exact_calls[index])
            if action.entity_id is not None:
                target = (action.entity_type, action.entity_id)
                if target in targets:
                    raise HTTPException(
                        status_code=422,
                        detail="Combine changes to the same item into one action.",
                    )
                targets.add(target)
                entity = await self.session.get(
                    _MODELS[action.entity_type], action.entity_id
                )
                stored["expected_hash"] = _entity_fingerprint(entity)
            stored_actions.append(stored)
        proposal = AgentProposal(
            id=str(uuid4()),
            question=query,
            summary=planned.message or "Review these proposed changes.",
            actions=stored_actions,
            schema_version=2,
            status="pending",
            expires_at=datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=30),
        )
        self.session.add(proposal)
        await self.session.commit()
        return AgentPlanResponse(
            id=proposal.id,
            message=proposal.summary,
            actions=actions,
            expires_at=proposal.expires_at,
            sources=planned.sources,
        )

    @staticmethod
    def _normalize_action(action: AgentAction) -> AgentAction:
        """Map common planner terminology to TodAI's task schema before review."""
        if action.entity_type != "task" or "due_date" not in action.fields:
            return action
        if "deadline" in action.fields:
            raise HTTPException(
                status_code=422, detail="The proposed task has conflicting due dates."
            )
        fields = dict(action.fields)
        fields["deadline"] = fields.pop("due_date")
        return action.model_copy(update={"fields": fields})

    async def _validate_action(
        self, action: AgentAction, visible_ids: set[tuple[str, int]] | None = None
    ) -> None:
        kind, operation, fields = action.entity_type, action.operation, action.fields
        if action.entity_id is not None:
            if visible_ids is not None and (kind, action.entity_id) not in visible_ids:
                raise HTTPException(
                    status_code=422,
                    detail=f"{kind} #{action.entity_id} was not found in the reviewed context. Ask more specifically.",
                )
            if await self.session.get(_MODELS[kind], action.entity_id) is None:
                raise HTTPException(
                    status_code=422,
                    detail=f"{kind} #{action.entity_id} no longer exists.",
                )
        if operation in {"create", "update"}:
            if operation == "update" and kind == "inbox_item":
                raise HTTPException(
                    status_code=422,
                    detail="Inbox items cannot be edited; convert or delete them.",
                )
            allowed = (
                _CREATE_FIELDS[kind] if operation == "create" else _UPDATE_FIELDS[kind]
            )
            if not fields or set(fields) - allowed:
                raise HTTPException(
                    status_code=422,
                    detail=f"Unsupported fields for {kind} {operation}.",
                )
            if operation == "create" and not any(
                str(fields.get(key, "")).strip() for key in ("title", "name", "content")
            ):
                raise HTTPException(
                    status_code=422,
                    detail="The proposed item needs a title or content.",
                )
            if ("title" in fields and not str(fields["title"] or "").strip()) or (
                "name" in fields and not str(fields["name"] or "").strip()
            ):
                raise HTTPException(
                    status_code=422, detail="Titles and names cannot be blank."
                )
            payload = self._payload(action)
            schema = (
                _CREATE_SCHEMAS[kind]
                if operation == "create"
                else _UPDATE_SCHEMAS[kind]
            )
            try:
                validated = schema.model_validate(payload)
            except ValidationError as exc:
                raise HTTPException(
                    status_code=422, detail="The proposed fields are invalid."
                ) from exc
            project_id = getattr(validated, "project_id", None)
            if (
                project_id is not None
                and await self.session.get(Project, project_id) is None
            ):
                raise HTTPException(
                    status_code=422, detail=f"Project #{project_id} does not exist."
                )
        elif operation in {"archive", "unarchive"}:
            if kind == "inbox_item" or fields:
                raise HTTPException(
                    status_code=422,
                    detail="This item cannot be archived or this action has unexpected fields.",
                )
        elif operation == "delete":
            if fields:
                raise HTTPException(
                    status_code=422, detail="Delete actions cannot have fields."
                )
        elif operation == "convert":
            targets = {
                "idea": {"note", "task", "project"},
                "inbox_item": {"note", "task", "idea"},
            }
            if (
                kind not in targets
                or set(fields) != {"target_type"}
                or fields["target_type"] not in targets[kind]
            ):
                raise HTTPException(status_code=422, detail="Unsupported conversion.")
        elif operation in {"tag", "untag"}:
            if (
                set(fields) != {"tag_id"}
                or type(fields["tag_id"]) is not int
                or await self.session.get(Tag, fields["tag_id"]) is None
            ):
                raise HTTPException(status_code=422, detail="Tag does not exist.")

    @staticmethod
    def _payload(action: AgentAction) -> dict:
        payload = dict(action.fields)
        if action.entity_type in {"note", "inbox_item"} and isinstance(
            payload.get("content"), str
        ):
            payload["content"] = _rich_text(payload["content"])
        if action.entity_type == "project" and isinstance(
            payload.get("description"), str
        ):
            payload["description"] = _rich_text(payload["description"])
        return payload

    async def decide(self, proposal_id: str, approve: bool) -> AgentApplyResponse:
        now = datetime.now(UTC).replace(tzinfo=None)
        result = await self.session.execute(
            update(AgentProposal)
            .where(
                AgentProposal.id == proposal_id,
                AgentProposal.status == "pending",
                AgentProposal.expires_at > now,
            )
            .values(status="applying" if approve else "rejected")
            .returning(AgentProposal.id)
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=409, detail="Proposal was already handled or has expired."
            )
        await self.session.commit()
        if not approve:
            return AgentApplyResponse(status="rejected")

        proposal = await self.session.get(AgentProposal, proposal_id)
        if proposal.schema_version != 2:
            proposal.status = "failed"
            proposal.failure_reason = (
                "This proposal uses an older tool schema. Ask Tod for a fresh plan."
            )
            proposal.completed_at = now
            await self.session.commit()
            raise HTTPException(status_code=409, detail=proposal.failure_reason)
        actions = [AgentAction.model_validate(item) for item in proposal.actions]
        results: list[AgentApplyResult] = []
        try:
            # Validate the entire batch and all optimistic-lock fingerprints before
            # entering the transaction. Nothing starts if one action is stale.
            for index, action in enumerate(actions):
                await self._validate_action(action)
                if action.entity_id is not None:
                    entity = await self.session.get(
                        _MODELS[action.entity_type], action.entity_id
                    )
                    if _entity_fingerprint(entity) != proposal.actions[index].get(
                        "expected_hash"
                    ):
                        raise HTTPException(
                            status_code=409,
                            detail="This item changed since the proposal. Ask Tod to make a fresh plan.",
                        )
            if self.emit:
                await self.emit(
                    "batch_started",
                    {
                        "proposal_id": proposal_id,
                        "count": len(actions),
                        "message": "Applying the approved batch",
                    },
                )

            async def execute_tool(
                name: str, arguments: dict[str, Any]
            ) -> dict[str, Any]:
                action = AgentAction.model_validate(
                    tool_call_to_action(name, arguments)
                )
                entity_id = await self._execute(action)
                result_kind = (
                    action.fields["target_type"]
                    if action.operation == "convert"
                    else action.entity_type
                )
                result = AgentApplyResult(
                    operation=action.operation,
                    entity_type=result_kind,
                    entity_id=entity_id,
                    description=action.description,
                    success=True,
                    detail="Applied",
                    url=self._url(result_kind, entity_id)
                    if entity_id and action.operation != "delete"
                    else None,
                )
                results.append(result)
                return result.model_dump(mode="json")

            executor_mcp = TodMCP(self.session, executor=execute_tool)
            async with (
                self.session.atomic_batch(),
                Client(  # type: ignore[attr-defined]
                    executor_mcp.server, raise_exceptions=True
                ) as client,
            ):
                for index, stored in enumerate(proposal.actions):
                    tool_name = stored.get("tool_name")
                    arguments = stored.get("arguments")
                    if not tool_name or not isinstance(arguments, dict):
                        raise ValueError("Proposal is missing its exact MCP tool call")
                    if self.emit:
                        await self.emit(
                            "tool_started",
                            {"tool": tool_name, "message": actions[index].description},
                        )

                    async def progress(
                        value: float,
                        total: float | None,
                        message: str | None,
                        *,
                        current: str = tool_name,
                    ) -> None:
                        if self.emit:
                            await self.emit(
                                "tool_progress",
                                {
                                    "tool": current,
                                    "progress": value,
                                    "total": total,
                                    "message": message,
                                },
                            )

                    call_result = await client.call_tool(
                        tool_name, arguments, progress_callback=progress
                    )
                    if call_result.is_error:
                        raise RuntimeError(f"MCP tool {tool_name} failed")
                    mcp_result_json(call_result)
                    if self.emit:
                        await self.emit(
                            "tool_completed",
                            {
                                "tool": tool_name,
                                "message": actions[index].description,
                                "outcome": "applied",
                            },
                        )
            proposal = await self.session.get(AgentProposal, proposal_id)
            proposal.status = "applied"
            proposal.results = [item.model_dump(mode="json") for item in results]
            proposal.completed_at = datetime.now(UTC).replace(tzinfo=None)
            await self.session.commit()
            if self.emit:
                await self.emit(
                    "batch_committed",
                    {
                        "proposal_id": proposal_id,
                        "count": len(results),
                        "message": "All changes were applied",
                    },
                )
            return AgentApplyResponse(status="applied", results=results)
        except Exception as exc:  # noqa: BLE001 - every failure must roll back the approved batch
            await self.session.rollback()
            proposal = await self.session.get(AgentProposal, proposal_id)
            detail = (
                exc.detail
                if isinstance(exc, HTTPException)
                else "The batch failed and no changes were saved."
            )
            failed = [
                AgentApplyResult(
                    operation=action.operation,
                    entity_type=action.entity_type,
                    entity_id=action.entity_id,
                    description=action.description,
                    success=False,
                    detail=str(detail),
                )
                for action in actions
            ]
            proposal.status = "failed"
            proposal.results = [item.model_dump(mode="json") for item in failed]
            proposal.failure_reason = str(detail)
            proposal.completed_at = datetime.now(UTC).replace(tzinfo=None)
            await self.session.commit()
            if self.emit:
                await self.emit(
                    "batch_rolled_back",
                    {"proposal_id": proposal_id, "message": str(detail)},
                )
            return AgentApplyResponse(status="failed", results=failed)

    async def _execute(self, action: AgentAction) -> int | None:
        kind, operation, entity_id = (
            action.entity_type,
            action.operation,
            action.entity_id,
        )
        services = {
            "note": NoteService,
            "task": TaskService,
            "idea": IdeaService,
            "project": ProjectService,
            "inbox_item": InboxService,
        }
        service = services[kind](self.session)
        if operation == "create":
            schema = _CREATE_SCHEMAS[kind].model_validate(self._payload(action))
            return (await service.create(schema)).id
        if operation == "update":
            schema = _UPDATE_SCHEMAS[kind].model_validate(self._payload(action))
            return (await service.update(entity_id, schema)).id
        if operation in {"archive", "unarchive"}:
            return (await getattr(service, operation)(entity_id)).id
        if operation == "delete":
            await service.delete(entity_id)
            return entity_id
        if operation == "convert":
            source = "inbox" if kind == "inbox_item" else "idea"
            method = getattr(
                ConversionService(self.session),
                f"convert_{source}_to_{action.fields['target_type']}",
            )
            return (await method(entity_id)).id
        tags = TagRepository(self.session)
        if operation == "tag":
            await tags.add_tag_to_entity(action.fields["tag_id"], kind, entity_id)
        else:
            removed = await tags.remove_tag_from_entity(
                action.fields["tag_id"], kind, entity_id
            )
            if not removed:
                raise HTTPException(
                    status_code=409, detail="This tag is not attached to the item."
                )
        await AuditService(self.session).log(
            entity_type=kind,
            entity_id=entity_id,
            action=operation,
            changes={"tag_id": action.fields["tag_id"]},
        )
        await self.session.commit()
        return entity_id

    @staticmethod
    def _url(kind: str, entity_id: int) -> str:
        if kind == "inbox_item":
            return f"/inbox#item-{entity_id}"
        return f"/{_URL_PREFIX[kind]}/{entity_id}"
