"""Session-scoped, replayable activity streams for background Agent runs."""

from __future__ import annotations

import asyncio
import time
from collections import OrderedDict
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from app.database import AsyncSessionLocal
from app.schemas.agent import AgentPlanRequest

TERMINAL_EVENTS = {"run_completed", "run_failed", "approval_required"}


@dataclass
class AgentRun:
    id: str
    kind: str
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    events: list[dict[str, Any]] = field(default_factory=list)
    condition: asyncio.Condition = field(default_factory=asyncio.Condition)
    terminal: bool = False
    started_at: float = field(default_factory=time.monotonic)

    async def emit(self, event: str, data: dict[str, Any] | None = None) -> None:
        async with self.condition:
            payload = dict(data or {})
            payload.setdefault("run_id", self.id)
            payload["elapsed_ms"] = round((time.monotonic() - self.started_at) * 1000)
            self.events.append(
                {"sequence": len(self.events) + 1, "event": event, "data": payload}
            )
            if event in TERMINAL_EVENTS:
                self.terminal = True
            self.condition.notify_all()


class AgentRunManager:
    def __init__(self, max_runs: int = 20, ttl_minutes: int = 30) -> None:
        self.max_runs = max_runs
        self.ttl = timedelta(minutes=ttl_minutes)
        self.runs: OrderedDict[str, AgentRun] = OrderedDict()
        self.tasks: set[asyncio.Task[Any]] = set()

    def _prune(self) -> None:
        cutoff = datetime.now(UTC) - self.ttl
        for run_id in [
            key for key, run in self.runs.items() if run.created_at < cutoff
        ]:
            self.runs.pop(run_id, None)
        while len(self.runs) >= self.max_runs:
            self.runs.popitem(last=False)

    def _launch(
        self, kind: str, work: Callable[[AgentRun], Awaitable[None]]
    ) -> AgentRun:
        self._prune()
        run = AgentRun(id=str(uuid4()), kind=kind)
        self.runs[run.id] = run

        async def guarded() -> None:
            try:
                await run.emit(
                    "run_started",
                    {"run_id": run.id, "kind": kind, "message": "Tod started working"},
                )
                await work(run)
            except Exception as exc:  # noqa: BLE001 - background failures must become terminal events
                await run.emit(
                    "run_failed",
                    {"message": str(exc) or "Tod could not complete this run."},
                )

        task = asyncio.create_task(guarded(), name=f"tod-agent-{kind}-{run.id}")
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)
        return run

    def start_plan(self, request: AgentPlanRequest) -> AgentRun:
        async def work(run: AgentRun) -> None:
            from app.services.agent_service import AgentService

            async with AsyncSessionLocal() as session:
                result = await AgentService(session, emit=run.emit).plan(request)
                payload = result.model_dump(mode="json")
                if result.actions:
                    if request.approval_mode == "auto":
                        await run.emit(
                            "auto_approved",
                            {
                                "proposal_id": result.id,
                                "count": len(result.actions),
                                "message": "Auto mode approved the validated changes",
                            },
                        )
                        decision = await AgentService(session, emit=run.emit).decide(
                            result.id, approve=True
                        )
                        auto_payload = dict(payload)
                        auto_payload["message"] = (
                            f"Auto mode applied {len(result.actions)} validated "
                            f"change{'s' if len(result.actions) != 1 else ''}."
                        )
                        await run.emit(
                            "run_completed",
                            {
                                "mode": "auto",
                                "plan": auto_payload,
                                "decision": decision.model_dump(mode="json"),
                            },
                        )
                    else:
                        await run.emit("proposal_ready", payload)
                        await run.emit(
                            "approval_required",
                            {"proposal_id": result.id, "count": len(result.actions)},
                        )
                else:
                    await run.emit("run_completed", payload)

        return self._launch("planning", work)

    def start_approval(self, proposal_id: str) -> AgentRun:
        async def work(run: AgentRun) -> None:
            from app.services.agent_service import AgentService

            async with AsyncSessionLocal() as session:
                result = await AgentService(session, emit=run.emit).decide(
                    proposal_id, approve=True
                )
                await run.emit("run_completed", result.model_dump(mode="json"))

        return self._launch("execution", work)

    async def reject(self, proposal_id: str) -> None:
        from app.services.agent_service import AgentService

        async with AsyncSessionLocal() as session:
            await AgentService(session).decide(proposal_id, approve=False)

    def get(self, run_id: str) -> AgentRun | None:
        self._prune()
        return self.runs.get(run_id)

    async def stream(
        self, run_id: str, after: int = 0
    ) -> AsyncIterator[dict[str, Any]]:
        run = self.get(run_id)
        if run is None:
            return
        cursor = max(after, 0)
        while True:
            async with run.condition:
                while cursor >= len(run.events) and not run.terminal:
                    await run.condition.wait()
                pending = run.events[cursor:]
                cursor = len(run.events)
            for event in pending:
                yield event
            if run.terminal and cursor >= len(run.events):
                break


agent_runs = AgentRunManager()
