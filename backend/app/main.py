"""TodAI FastAPI application."""

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.requests import Request
from starlette.staticfiles import StaticFiles

from app.api.activity import router as activity_router
from app.api.agent import router as agent_router
from app.api.export import router as export_router
from app.api.ideas import router as ideas_router
from app.api.inbox import router as inbox_router
from app.api.notes import router as notes_router
from app.api.projects import router as projects_router
from app.api.search import router as search_router
from app.api.system import router as system_router
from app.api.tags import router as tags_router
from app.api.tasks import router as tasks_router
from app.core.exceptions import EntityNotFoundError
from app.database import AsyncSessionLocal, engine
from app.migrations import upgrade_database
from app.services.agent_service import recover_agent_proposals


class SPAStaticFiles(StaticFiles):
    """StaticFiles subclass that falls back to index.html for SPA routing."""

    async def get_response(self, path: str, scope: dict) -> object:
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """Upgrade the database before serving requests and close it on shutdown."""
    await asyncio.to_thread(upgrade_database)
    async with AsyncSessionLocal() as session:
        await recover_agent_proposals(session)
    try:
        yield
    finally:
        await engine.dispose()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title="TodAI",
        version="0.1.0",
        lifespan=lifespan,
    )

    @application.exception_handler(EntityNotFoundError)
    async def entity_not_found_handler(
        request: Request, exc: EntityNotFoundError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"detail": str(exc)},
        )

    @application.get("/api/v1/health")
    async def health_check() -> dict:
        return {"status": "ok"}

    application.include_router(notes_router, prefix="/api/v1")
    application.include_router(tasks_router, prefix="/api/v1")
    application.include_router(ideas_router, prefix="/api/v1")
    application.include_router(tags_router, prefix="/api/v1")
    application.include_router(system_router, prefix="/api/v1")
    application.include_router(projects_router, prefix="/api/v1")
    application.include_router(inbox_router, prefix="/api/v1")
    application.include_router(export_router, prefix="/api/v1")
    application.include_router(search_router, prefix="/api/v1")
    application.include_router(agent_router, prefix="/api/v1")
    application.include_router(activity_router, prefix="/api/v1")

    frontend_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
    if frontend_dir.exists():
        application.mount(
            "/",
            SPAStaticFiles(directory=str(frontend_dir), html=True),
            name="frontend",
        )

    return application


app = create_app()
