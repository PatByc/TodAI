"""Tag management API routes."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.tag import (
    EntityTagCreate,
    TagCreate,
    TagResponse,
    TagSummaryResponse,
    TagUpdate,
)
from app.services.tag_service import TagService

router = APIRouter(prefix="/tags", tags=["tags"])


def get_tag_service(session: AsyncSession = Depends(get_db)) -> TagService:
    """Dependency injection factory for TagService."""
    return TagService(session)


@router.get("/", response_model=list[TagSummaryResponse])
async def list_tags(
    service: TagService = Depends(get_tag_service),
) -> list[TagSummaryResponse]:
    """List all tags."""
    tags = await service.list_tags_with_usage()
    return [
        TagSummaryResponse(
            **TagResponse.model_validate(tag).model_dump(), usage_count=usage_count
        )
        for tag, usage_count in tags
    ]


@router.get("/search", response_model=list[TagResponse])
async def search_tags(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50),
    service: TagService = Depends(get_tag_service),
) -> list[TagResponse]:
    """Search tags by name prefix for autocomplete."""
    tags = await service.search_tags(q, limit=limit)
    return [TagResponse.model_validate(tag) for tag in tags]


@router.post("/", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    data: TagCreate,
    service: TagService = Depends(get_tag_service),
) -> TagResponse:
    """Create a new tag."""
    tag = await service.create_tag(data.name, data.color_index)
    return TagResponse.model_validate(tag)


@router.post("/entity", status_code=status.HTTP_201_CREATED)
async def add_tag_to_entity(
    data: EntityTagCreate,
    service: TagService = Depends(get_tag_service),
) -> dict:
    """Associate a tag with an entity."""
    await service.add_tag_to_entity(data.tag_id, data.entity_type, data.entity_id)
    return {"status": "ok"}


@router.delete("/entity")
async def remove_tag_from_entity(
    tag_id: int = Query(...),
    entity_type: str = Query(...),
    entity_id: int = Query(...),
    service: TagService = Depends(get_tag_service),
) -> dict:
    """Remove a tag association from an entity."""
    removed = await service.remove_tag_from_entity(tag_id, entity_type, entity_id)
    return {"removed": removed}


@router.get("/entity/{entity_type}/{entity_id}", response_model=list[TagResponse])
async def get_entity_tags(
    entity_type: str,
    entity_id: int,
    service: TagService = Depends(get_tag_service),
) -> list[TagResponse]:
    """Get all tags for a specific entity."""
    tags = await service.get_entity_tags(entity_type, entity_id)
    return [TagResponse.model_validate(tag) for tag in tags]


@router.patch("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    data: TagUpdate,
    service: TagService = Depends(get_tag_service),
) -> TagResponse:
    """Update a tag's shared workspace-palette color."""
    return TagResponse.model_validate(
        await service.update_tag_color(tag_id, data.color_index)
    )


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: int,
    service: TagService = Depends(get_tag_service),
) -> None:
    """Permanently delete a tag and all of its entity associations."""
    await service.delete_tag(tag_id)
