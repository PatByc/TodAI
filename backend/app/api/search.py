"""Universal hybrid search API."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.search import RebuildResponse, SearchResponse
from app.services.efficiency_service import measure_operation
from app.services.search_index_service import SearchIndexService

router = APIRouter(prefix="/search", tags=["search"])
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=SearchResponse)
async def search(
    session: DatabaseSession,
    q: Annotated[str, Query(min_length=1, max_length=500)],
    mode: Annotated[Literal["keyword", "semantic", "hybrid"], Query()] = "hybrid",
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> SearchResponse:
    async with measure_operation(session, "search"):
        return await SearchIndexService(session).search(q, mode, limit)


@router.post("/rebuild", response_model=RebuildResponse)
async def rebuild_search_index(
    session: DatabaseSession,
) -> RebuildResponse:
    async with measure_operation(session, "search_rebuild"):
        count = await SearchIndexService(session).rebuild()
        await session.commit()
    return RebuildResponse(chunks_indexed=count)
