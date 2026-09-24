"""Private, in-process MCP tool catalog used by Tod.

The server is intentionally never mounted as an HTTP endpoint.  It gives the model a
standard tool contract while keeping authorization and execution inside TodAI.
"""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any

from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.tools import Tool
from pydantic import BaseModel, ConfigDict, Field, create_model
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.idea import Idea
from app.models.inbox_item import InboxItem
from app.models.note import Note
from app.models.project import Project
from app.models.tag import Tag
from app.models.task import Task
from app.services.search_index_service import SearchIndexService

ToolProgress = Callable[[float, float | None, str | None], Awaitable[None]]
MutationExecutor = Callable[[str, dict[str, Any]], Awaitable[dict[str, Any]]]

ENTITY_MODELS = {
    "note": Note,
    "task": Task,
    "idea": Idea,
    "project": Project,
    "inbox_item": InboxItem,
}


class ToolInput(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SearchInput(ToolInput):
    query: str = Field(min_length=1, max_length=500)


class GetInput(ToolInput):
    id: int = Field(gt=0)


class DiscoverInput(ToolInput):
    intent: str = Field(min_length=1, max_length=500)


class CreateNoteInput(ToolInput):
    title: str = Field(min_length=1, max_length=500)
    content: str = Field(default="", max_length=50_000)
    project_id: int | None = Field(default=None, gt=0)


class CreateTaskInput(ToolInput):
    title: str = Field(min_length=1, max_length=500)
    description: str = Field(default="", max_length=20_000)
    priority: int = Field(default=3, ge=1, le=5)
    urgency: int = Field(default=3, ge=1, le=5)
    progress: int = Field(default=0, ge=0, le=100)
    status: str = "backlog"
    deadline: datetime | None = None
    project_id: int | None = Field(default=None, gt=0)


class CreateIdeaInput(ToolInput):
    title: str = Field(min_length=1, max_length=500)
    content: str = Field(default="", max_length=50_000)
    state: str = "raw"
    project_id: int | None = Field(default=None, gt=0)


class CreateProjectInput(ToolInput):
    name: str = Field(min_length=1, max_length=500)
    description: str = Field(default="", max_length=50_000)
    goals: str | None = Field(default=None, max_length=20_000)
    current_focus: str | None = Field(default=None, max_length=20_000)


class CreateInboxInput(ToolInput):
    content: str = Field(min_length=1, max_length=50_000)


class UpdateNoteInput(ToolInput):
    id: int = Field(gt=0)
    title: str | None = Field(default=None, min_length=1, max_length=500)
    content: str | None = Field(default=None, max_length=50_000)
    pinned: bool | None = None
    project_id: int | None = Field(default=None, gt=0)


class UpdateTaskInput(ToolInput):
    id: int = Field(gt=0)
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=20_000)
    priority: int | None = Field(default=None, ge=1, le=5)
    urgency: int | None = Field(default=None, ge=1, le=5)
    progress: int | None = Field(default=None, ge=0, le=100)
    status: str | None = None
    deadline: datetime | None = None
    project_id: int | None = Field(default=None, gt=0)


class UpdateIdeaInput(ToolInput):
    id: int = Field(gt=0)
    title: str | None = Field(default=None, min_length=1, max_length=500)
    content: str | None = Field(default=None, max_length=50_000)
    state: str | None = None
    project_id: int | None = Field(default=None, gt=0)


class UpdateProjectInput(ToolInput):
    id: int = Field(gt=0)
    name: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=50_000)
    goals: str | None = Field(default=None, max_length=20_000)
    current_focus: str | None = Field(default=None, max_length=20_000)
    status: str | None = None


class TagInput(ToolInput):
    id: int = Field(gt=0)
    tag_id: int = Field(gt=0)


class ConvertInput(ToolInput):
    id: int = Field(gt=0)


def _single_id_model(name: str) -> type[ToolInput]:
    return create_model(name, __base__=ToolInput, id=(int, Field(gt=0)))


_CREATE_MODELS = {
    "note": CreateNoteInput,
    "task": CreateTaskInput,
    "idea": CreateIdeaInput,
    "project": CreateProjectInput,
    "inbox_item": CreateInboxInput,
}
_UPDATE_MODELS = {
    "note": UpdateNoteInput,
    "task": UpdateTaskInput,
    "idea": UpdateIdeaInput,
    "project": UpdateProjectInput,
}


def mutation_names() -> set[str]:
    names = {f"create_{kind}" for kind in _CREATE_MODELS}
    names |= {f"update_{kind}" for kind in _UPDATE_MODELS}
    for kind in ("note", "task", "idea", "project"):
        names |= {
            f"{verb}_{kind}"
            for verb in ("archive", "unarchive", "delete", "tag", "untag")
        }
    names.add("delete_inbox_item")
    names |= {
        "convert_idea_to_note",
        "convert_idea_to_task",
        "convert_idea_to_project",
        "convert_inbox_item_to_note",
        "convert_inbox_item_to_task",
        "convert_inbox_item_to_idea",
    }
    return names


MUTATION_TO_ACTION: dict[str, tuple[str, str, str | None]] = {}
for _kind in _CREATE_MODELS:
    MUTATION_TO_ACTION[f"create_{_kind}"] = ("create", _kind, None)
for _kind in _UPDATE_MODELS:
    MUTATION_TO_ACTION[f"update_{_kind}"] = ("update", _kind, None)
for _kind in ("note", "task", "idea", "project"):
    for _verb in ("archive", "unarchive", "delete", "tag", "untag"):
        MUTATION_TO_ACTION[f"{_verb}_{_kind}"] = (_verb, _kind, None)
MUTATION_TO_ACTION["delete_inbox_item"] = ("delete", "inbox_item", None)
for _source, _targets in {
    "idea": ("note", "task", "project"),
    "inbox_item": ("note", "task", "idea"),
}.items():
    for _target in _targets:
        MUTATION_TO_ACTION[f"convert_{_source}_to_{_target}"] = (
            "convert",
            _source,
            _target,
        )


def tool_call_to_action(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    operation, entity_type, target_type = MUTATION_TO_ACTION[name]
    data = dict(arguments.get("input", arguments))
    entity_id = data.pop("id", None)
    fields = data
    if target_type:
        fields = {"target_type": target_type}
    label = entity_type.replace("_", " ")
    if operation == "create":
        subject = (
            fields.get("title") or fields.get("name") or fields.get("content", "")[:60]
        )
        description = f"Create {label}: {subject}"
    elif operation == "convert":
        description = f"Convert {label} #{entity_id} to {target_type}"
    else:
        description = f"{operation.title()} {label} #{entity_id}"
    return {
        "operation": operation,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "fields": fields,
        "description": description,
    }


def _json_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "value"):
        return value.value
    return value


def _record(entity: Any, kind: str) -> dict[str, Any]:
    fields = {
        column.name: _json_value(getattr(entity, column.name))
        for column in entity.__table__.columns
    }
    for key, value in tuple(fields.items()):
        if isinstance(value, str):
            fields[key] = value[:8_000]
    return {
        "entity_type": kind,
        "entity_id": entity.id,
        "title": getattr(entity, "title", None)
        or getattr(entity, "name", None)
        or f"Inbox item {entity.id}",
        "url": f"/inbox#item-{entity.id}"
        if kind == "inbox_item"
        else f"/{'ideas' if kind == 'idea' else kind + 's'}/{entity.id}",
        "fields": fields,
    }


def _make_tool(
    name: str,
    description: str,
    input_model: type[ToolInput],
    handler: Callable[[str, dict[str, Any]], Awaitable[dict[str, Any]]],
) -> Tool:
    async def invoke(input: input_model) -> dict[str, Any]:  # type: ignore[valid-type]
        return await handler(name, input.model_dump(mode="json", exclude_unset=True))

    invoke.__name__ = name
    invoke.__annotations__ = {"input": input_model, "return": dict[str, Any]}
    return Tool.from_function(
        invoke, name=name, description=description, structured_output=True
    )


class TodMCP:
    """One run-scoped MCP server with access only to the supplied DB session."""

    def __init__(
        self, session: AsyncSession, executor: MutationExecutor | None = None
    ) -> None:
        self.session = session
        self.executor = executor
        self.read_ids: set[tuple[str, int]] = set()
        self.server = MCPServer(
            name="TodAI",
            instructions="Private tools for the Tod personal productivity agent.",
        )
        self._register_tools()

    async def _handle(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        if name == "search_records":
            found = await SearchIndexService(self.session).search(
                arguments["query"], mode="hybrid", limit=10
            )
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
        if name.startswith("get_"):
            kind = name.removeprefix("get_")
            entity = await self.session.get(ENTITY_MODELS[kind], arguments["id"])
            if entity is None:
                return {"error": "Record no longer exists."}
            self.read_ids.add((kind, entity.id))
            return _record(entity, kind)
        if name == "list_tags":
            rows = (
                (await self.session.execute(select(Tag).order_by(Tag.name).limit(100)))
                .scalars()
                .all()
            )
            return {
                "tags": [
                    {"id": tag.id, "name": tag.name, "color_index": tag.color_index}
                    for tag in rows
                ]
            }
        if name == "discover_tools":
            intent = arguments["intent"].lower().replace("-", "_")
            words = {word.strip(".,:;!?'") for word in intent.split() if len(word) >= 4}
            operations: set[str] = set()
            operation_terms = {
                "create": {"create", "add", "new", "capture"},
                "update": {"update", "edit", "change", "rename", "reschedule"},
                "delete": {"delete", "remove", "dismiss"},
                "archive": {"archive"},
                "unarchive": {"unarchive", "restore"},
                "tag": {"tag", "label"},
                "untag": {"untag", "unlabel"},
                "convert": {"convert", "turn", "transform"},
            }
            for operation, terms in operation_terms.items():
                if terms & words:
                    operations.add(operation)
            entities = {
                entity
                for entity, terms in {
                    "note": {"note", "notes"},
                    "task": {"task", "tasks", "todo"},
                    "idea": {"idea", "ideas"},
                    "project": {"project", "projects"},
                    "inbox_item": {"inbox", "capture"},
                }.items()
                if terms & words
            }

            def score(tool: str) -> tuple[int, str]:
                value = 0
                if any(tool.startswith(f"{operation}_") for operation in operations):
                    value += 20
                value += 8 * sum(entity in tool for entity in entities)
                value += sum(word in tool for word in words)
                return (-value, tool)

            ranked = sorted(mutation_names(), key=score)
            relevant = [tool for tool in ranked if score(tool)[0] < 0]
            return {"tools": (relevant or ranked)[:8]}
        if self.executor is None:
            raise RuntimeError("Mutation tools require approval before execution.")
        return await self.executor(name, arguments)

    def _register_tools(self) -> None:
        tools: list[Tool] = [
            _make_tool(
                "search_records",
                "Search up to ten saved TodAI records. Read-only.",
                SearchInput,
                self._handle,
            ),
            _make_tool(
                "list_tags",
                "List available tags. Read-only.",
                create_model("ListTagsInput", __base__=ToolInput),
                self._handle,
            ),
            _make_tool(
                "discover_tools",
                "Find up to eight mutation tools relevant to an intended action. Read-only.",
                DiscoverInput,
                self._handle,
            ),
        ]
        for kind in ENTITY_MODELS:
            tools.append(
                _make_tool(
                    f"get_{kind}",
                    f"Read one {kind.replace('_', ' ')} by ID.",
                    GetInput,
                    self._handle,
                )
            )
        for kind, model in _CREATE_MODELS.items():
            tools.append(
                _make_tool(
                    f"create_{kind}",
                    f"Create a {kind.replace('_', ' ')} after human approval.",
                    model,
                    self._handle,
                )
            )
        for kind, model in _UPDATE_MODELS.items():
            tools.append(
                _make_tool(
                    f"update_{kind}",
                    f"Update a {kind} after human approval.",
                    model,
                    self._handle,
                )
            )
        for name in sorted(
            mutation_names()
            - {f"create_{k}" for k in _CREATE_MODELS}
            - {f"update_{k}" for k in _UPDATE_MODELS}
        ):
            model = (
                TagInput
                if name.startswith(("tag_", "untag_"))
                else ConvertInput
                if name.startswith("convert_")
                else _single_id_model(f"{name.title().replace('_', '')}Input")
            )
            tools.append(
                _make_tool(
                    name,
                    f"{name.replace('_', ' ').capitalize()} after human approval.",
                    model,
                    self._handle,
                )
            )
        for tool in tools:
            self.server.add_tool(
                tool.fn,
                name=tool.name,
                description=tool.description,
                structured_output=True,
            )


def mcp_result_json(result: Any) -> dict[str, Any]:
    if getattr(result, "structuredContent", None):
        value = result.structuredContent
        if isinstance(value, dict) and "result" in value and len(value) == 1:
            value = value["result"]
        return value
    for block in getattr(result, "content", []):
        text = getattr(block, "text", None)
        if text:
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {"message": text}
    return {}
