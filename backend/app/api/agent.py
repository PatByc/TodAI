"""Background Agent runs, replayable activity, and human approval endpoints."""

import json

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.schemas.agent import (
    AgentPlanRequest,
    AgentRejectResponse,
    AgentRunCreated,
    AgentStatus,
)
from app.services.agent_runs import agent_runs
from app.services.agent_service import agent_status

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/status", response_model=AgentStatus)
async def get_status() -> AgentStatus:
    return agent_status()


@router.post("/runs", response_model=AgentRunCreated, status_code=202)
async def start_run(request: AgentPlanRequest) -> AgentRunCreated:
    status = agent_status()
    if not status.available:
        raise HTTPException(status_code=503, detail=status.reason)
    return AgentRunCreated(run_id=agent_runs.start_plan(request).id)


@router.get("/runs/{run_id}/events")
async def run_events(
    run_id: str, after: int = Query(default=0, ge=0)
) -> StreamingResponse:
    if agent_runs.get(run_id) is None:
        raise HTTPException(
            status_code=404, detail="Agent run was not found or has expired."
        )

    async def stream():
        async for item in agent_runs.stream(run_id, after):
            yield f"id: {item['sequence']}\nevent: {item['event']}\ndata: {json.dumps(item['data'])}\n\n"

    return StreamingResponse(
        stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"}
    )


@router.post(
    "/proposals/{proposal_id}/approve", response_model=AgentRunCreated, status_code=202
)
async def approve_actions(proposal_id: str) -> AgentRunCreated:
    return AgentRunCreated(run_id=agent_runs.start_approval(proposal_id).id)


@router.post("/proposals/{proposal_id}/reject", response_model=AgentRejectResponse)
async def reject_actions(proposal_id: str) -> AgentRejectResponse:
    await agent_runs.reject(proposal_id)
    return AgentRejectResponse(status="rejected")
