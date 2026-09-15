"""Export API route for full data backup/download."""

import json

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.services.export_service import ExportService

router = APIRouter(prefix="/export", tags=["export"])


def get_export_service(session: AsyncSession = Depends(get_db)) -> ExportService:
    """Dependency injection factory for ExportService."""
    return ExportService(session)


@router.get("/")
async def export_data(
    format: str = Query("json", pattern="^(json|markdown)$"),
    service: ExportService = Depends(get_export_service),
) -> StreamingResponse:
    """Export all TodAI data as JSON or Markdown download.

    Query Parameters:
        format: "json" (default) or "markdown"

    Returns:
        StreamingResponse with Content-Disposition attachment header.
    """
    if format == "markdown":
        content = await service.export_markdown()
        return StreamingResponse(
            content=iter([content]),
            media_type="text/markdown",
            headers={
                "Content-Disposition": "attachment; filename=todai-export.md",
            },
        )
    else:
        data = await service.export_json()
        content = json.dumps(data, indent=2, ensure_ascii=False)
        return StreamingResponse(
            content=iter([content]),
            media_type="application/json",
            headers={
                "Content-Disposition": "attachment; filename=todai-export.json",
            },
        )
