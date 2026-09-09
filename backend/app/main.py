"""TodAI FastAPI application."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.requests import Request

from app.api.ideas import router as ideas_router
from app.api.notes import router as notes_router
from app.api.system import router as system_router
from app.api.tags import router as tags_router
from app.api.tasks import router as tasks_router
from app.core.exceptions import EntityNotFoundError


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager."""
    # Startup
    yield
    # Shutdown


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title="TodAI",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Register exception handlers
    @application.exception_handler(EntityNotFoundError)
    async def entity_not_found_handler(
        request: Request, exc: EntityNotFoundError
    ) -> JSONResponse:
        """Return 404 JSON response for EntityNotFoundError."""
        return JSONResponse(
            status_code=404,
            content={"detail": str(exc)},
        )

    # Health check
    @application.get("/api/v1/health")
    async def health_check() -> dict:
        """Health check endpoint."""
        return {"status": "ok"}

    # Register API routers under /api/v1
    application.include_router(notes_router, prefix="/api/v1")
    application.include_router(tasks_router, prefix="/api/v1")
    application.include_router(ideas_router, prefix="/api/v1")
    application.include_router(tags_router, prefix="/api/v1")
    application.include_router(system_router, prefix="/api/v1")

    return application


app = create_app()
