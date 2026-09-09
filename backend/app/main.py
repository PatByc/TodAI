"""TodAI FastAPI application."""

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI


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

    @application.get("/api/v1/health")
    async def health_check() -> dict:
        """Health check endpoint."""
        return {"status": "ok"}

    return application


app = create_app()
