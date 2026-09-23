"""Tod's MCP tools, reviewed proposals, atomic writes, and run activity."""

import pytest
from mcp import Client
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.database import TodAISession
from app.models.agent_proposal import AgentProposal
from app.models.tag import Tag
from app.models.task import Task
from app.providers.agent_provider import (
    AgentPlanResult,
    OpenAIActionPlanner,
    PlannedToolCall,
)
from app.schemas.agent import AgentPlanRequest
from app.services.agent_mcp import TodMCP
from app.services.agent_runs import AgentRun, AgentRunManager
from app.services.agent_service import AgentService


class FakePlanner:
    def __init__(self, *calls: PlannedToolCall) -> None:
        self.calls = list(calls)

    async def propose(self, question: str, history: str) -> AgentPlanResult:
        return AgentPlanResult("Review these changes.", self.calls)


def create_task(title: str = "Prepare launch") -> PlannedToolCall:
    return PlannedToolCall("create_task", {"input": {"title": title}})


@pytest.mark.asyncio
async def test_mcp_catalog_is_private_granular_and_callable(async_session):
    mcp = TodMCP(async_session)
    async with Client(mcp.server) as client:
        tools = await client.list_tools()
        names = {tool.name for tool in tools.tools}
        result = await client.call_tool("list_tags", {"input": {}})

    assert {
        "search_records",
        "get_task",
        "create_task",
        "update_task",
        "convert_idea_to_task",
    } <= names
    assert len(names) == 44
    assert result.is_error is False


@pytest.mark.asyncio
async def test_planning_stores_exact_tool_call_without_mutating(async_session):
    service = AgentService(async_session, planner=FakePlanner(create_task()))
    plan = await service.plan(AgentPlanRequest(question="Create a launch task"))

    assert await async_session.scalar(select(func.count()).select_from(Task)) == 0
    proposal = await async_session.get(AgentProposal, plan.id)
    assert proposal.status == "pending"
    assert proposal.schema_version == 2
    assert proposal.actions[0]["tool_name"] == "create_task"
    assert proposal.actions[0]["arguments"] == {"input": {"title": "Prepare launch"}}


@pytest.mark.asyncio
async def test_approval_executes_exact_mcp_call(async_session):
    service = AgentService(
        async_session, planner=FakePlanner(create_task("Go to shop"))
    )
    plan = await service.plan(AgentPlanRequest(question="Add go to shop"))
    result = await service.decide(plan.id, approve=True)

    assert result.status == "applied"
    assert result.results[0].url.startswith("/tasks/")
    assert await async_session.scalar(select(Task.title)) == "Go to shop"


@pytest.mark.asyncio
async def test_rejection_never_executes(async_session):
    service = AgentService(async_session, planner=FakePlanner(create_task()))
    plan = await service.plan(AgentPlanRequest(question="Create a task"))
    result = await service.decide(plan.id, approve=False)
    assert result.status == "rejected"
    assert await async_session.scalar(select(func.count()).select_from(Task)) == 0


@pytest.mark.asyncio
async def test_atomic_batch_rolls_back_every_write(async_engine):
    factory = async_sessionmaker(
        async_engine, class_=TodAISession, expire_on_commit=False
    )
    async with factory() as session:
        task = Task(title="Existing", priority=3, urgency=3)
        tag = Tag(name="unused", color_index=0)
        session.add_all([task, tag])
        await session.commit()
        calls = [
            create_task("Must roll back"),
            PlannedToolCall("untag_task", {"input": {"id": task.id, "tag_id": tag.id}}),
        ]
        plan = await AgentService(session, planner=FakePlanner(*calls)).plan(
            AgentPlanRequest(question="Batch")
        )
        result = await AgentService(session).decide(plan.id, approve=True)

        assert result.status == "failed"
        assert (
            await session.scalar(
                select(func.count())
                .select_from(Task)
                .where(Task.title == "Must roll back")
            )
            == 0
        )
        proposal = await session.get(AgentProposal, plan.id)
        assert proposal.status == "failed"
        assert "no changes" in proposal.failure_reason.lower()


@pytest.mark.asyncio
async def test_openai_discovers_write_schema_then_proposes(async_session):
    class Call:
        type = "function_call"

        def __init__(self, name: str, arguments: str, call_id: str):
            self.name, self.arguments, self.call_id = name, arguments, call_id

    class Response:
        output_text = ""

        def __init__(self, output):
            self.output = output

    class Responses:
        def __init__(self):
            self.requests = []

        async def create(self, **kwargs):
            self.requests.append(kwargs)
            if len(self.requests) == 1:
                return Response(
                    [
                        Call(
                            "discover_tools",
                            '{"input":{"intent":"create task"}}',
                            "one",
                        )
                    ]
                )
            return Response(
                [Call("create_task", '{"input":{"title":"Launch"}}', "two")]
            )

    planner = OpenAIActionPlanner("test", "gpt-test", TodMCP(async_session))
    responses = Responses()
    planner.client = type("OpenAI", (), {"responses": responses})()
    result = await planner.propose("Create a task", "")

    assert result.calls[0].name == "create_task"
    assert "create_task" not in {
        tool["name"] for tool in responses.requests[0]["tools"]
    }
    assert "create_task" in {tool["name"] for tool in responses.requests[1]["tools"]}
    assert all(request["store"] is False for request in responses.requests)


@pytest.mark.asyncio
async def test_run_events_are_ordered_and_replayable():
    run = AgentRun(id="run", kind="planning")
    manager = AgentRunManager()
    manager.runs[run.id] = run
    await run.emit("run_started", {"message": "Started"})
    await run.emit("run_completed", {"message": "Done"})
    events = [event async for event in manager.stream(run.id)]
    assert [event["sequence"] for event in events] == [1, 2]
