"""Read-only Ask Tod endpoints."""

import asyncio
import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.ask import AskRequest, AskResponse, AskStatus
from app.services.ask_service import AskService, ask_status
from app.services.efficiency_service import measure_operation

router = APIRouter(prefix="/ask", tags=["ask"])


def get_ask_service(session: Annotated[AsyncSession, Depends(get_db)]) -> AskService:
    return AskService(session)


@router.get("/status", response_model=AskStatus)
async def get_status() -> AskStatus:
    return ask_status()


@router.post("", response_model=AskResponse)
async def ask(
    request: AskRequest,
    service: Annotated[AskService, Depends(get_ask_service)],
) -> AskResponse:
    async with measure_operation(service.session, "ask"):
        return await service.ask(request)


@router.post("/stream")
async def ask_stream(
    request: AskRequest,
    service: Annotated[AskService, Depends(get_ask_service)],
) -> StreamingResponse:
    """Stream truthful workflow milestones, then the validated final answer."""
    if service.provider is None:
        raise HTTPException(status_code=503, detail=ask_status().reason)

    async def events():
        queue: asyncio.Queue[tuple[str, dict]] = asyncio.Queue()

        async def progress(stage: str, detail: str) -> None:
            await queue.put(("progress", {"stage": stage, "detail": detail}))

        async def run() -> None:
            try:
                async with measure_operation(service.session, "ask"):
                    result = await service.ask(request, on_progress=progress)
                await queue.put(("answer", result.model_dump()))
            except HTTPException as exc:
                await queue.put(("error", {"detail": str(exc.detail)}))
            except Exception:  # noqa: BLE001 - stream failures become safe SSE errors
                await queue.put(
                    ("error", {"detail": "Tod could not answer. Try again."})
                )

        task = asyncio.create_task(run())
        try:
            while True:
                event, data = await queue.get()
                yield f"event: {event}\ndata: {json.dumps(data)}\n\n"
                if event in {"answer", "error"}:
                    break
        finally:
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
