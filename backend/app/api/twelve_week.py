"""12 Week Year API."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.core.exceptions import ValidationError
from app.models.twelve_week import TwelveWeekCycle, TwelveWeekOccurrence
from app.schemas.twelve_week import (
    CycleCreate,
    CycleDetail,
    CycleSummary,
    GoalResponse,
    GoalWrite,
    ModelBlockResponse,
    ModelBlockWrite,
    OccurrenceResponse,
    OccurrenceUpdate,
    TacticResponse,
    TacticWrite,
    WeekResponse,
    WeekReviewUpdate,
    WorkbookUpdate,
)
from app.services.twelve_week_service import TwelveWeekService

router = APIRouter(prefix="/plan/12-week", tags=["12-week-year"])


def get_service(session: AsyncSession = Depends(get_db)) -> TwelveWeekService:
    return TwelveWeekService(session)


async def occurrence_response(
    service: TwelveWeekService, item: TwelveWeekOccurrence, week, tactic
) -> OccurrenceResponse:
    view = await service.occurrence_view(item, week, tactic)
    return OccurrenceResponse(
        id=item.id,
        tactic_id=item.tactic_id,
        week_number=week.week_number,
        manual_completed=item.manual_completed,
        manual_note=item.manual_note,
        linked_task_id=item.linked_task_id,
        **view,
    )


async def detail_response(
    service: TwelveWeekService, cycle: TwelveWeekCycle
) -> CycleDetail:
    occurrence_cache: dict[int, OccurrenceResponse] = {}
    tactics = {tactic.id: tactic for goal in cycle.goals for tactic in goal.tactics}
    for week in cycle.weeks:
        for item in week.occurrences:
            occurrence_cache[item.id] = await occurrence_response(
                service, item, week, tactics[item.tactic_id]
            )
    goals = [
        GoalResponse(
            id=goal.id,
            cycle_id=goal.cycle_id,
            position=goal.position,
            title=goal.title,
            success_criteria=goal.success_criteria,
            mind_map=goal.mind_map,
            linked_time_goal_id=goal.linked_time_goal_id,
            linked_metric_goal_id=goal.linked_metric_goal_id,
            tactics=[
                TacticResponse(
                    id=tactic.id,
                    goal_id=tactic.goal_id,
                    position=tactic.position,
                    title=tactic.title,
                    notes=tactic.notes,
                    due_weeks=tactic.due_weeks,
                    rule_kind=tactic.rule_kind,
                    rule_config=tactic.rule_config,
                    occurrences=[
                        occurrence_cache[item.id]
                        for item in sorted(
                            tactic.occurrences,
                            key=lambda value: occurrence_cache[value.id].week_number,
                        )
                    ],
                )
                for tactic in goal.tactics
            ],
        )
        for goal in cycle.goals
    ]
    weeks = [
        WeekResponse(
            id=week.id,
            week_number=week.week_number,
            starts_on=week.starts_on,
            ends_on=week.ends_on,
            review=week.review,
            score=week.score,
            finalized_at=week.finalized_at,
            occurrences=[occurrence_cache[item.id] for item in week.occurrences],
        )
        for week in cycle.weeks
    ]
    blocks = [
        ModelBlockResponse(
            id=block.id,
            weekday=block.weekday,
            starts_at=block.starts_at,
            duration_minutes=block.duration_minutes,
            kind=block.kind,
            title=block.title,
            description=block.description,
            materialized_weeks=sorted(
                item.week_number
                for item in block.instances
                if item.planned_block_id is not None
            ),
        )
        for block in cycle.model_blocks
    ]
    return CycleDetail(
        id=cycle.id,
        title=cycle.title,
        start_date=cycle.start_date,
        end_date=cycle.end_date,
        status=cycle.status,
        timezone=cycle.timezone,
        workbook_version=cycle.workbook_version,
        workbook_answers=cycle.workbook_answers,
        activated_at=cycle.activated_at,
        closed_at=cycle.closed_at,
        goals=goals,
        weeks=weeks,
        model_blocks=blocks,
        created_at=cycle.created_at,
        updated_at=cycle.updated_at,
    )


@router.get("/cycles", response_model=list[CycleSummary])
async def list_cycles(service: TwelveWeekService = Depends(get_service)):
    return [
        CycleSummary.model_validate(item, from_attributes=True)
        for item in await service.list_cycles()
    ]


@router.post("/cycles", response_model=CycleDetail, status_code=status.HTTP_201_CREATED)
async def create_cycle(
    data: CycleCreate, service: TwelveWeekService = Depends(get_service)
):
    return await detail_response(service, await service.create_cycle(data))


@router.get("/cycles/{cycle_id}", response_model=CycleDetail)
async def get_cycle(cycle_id: int, service: TwelveWeekService = Depends(get_service)):
    return await detail_response(service, await service.get_cycle(cycle_id))


@router.delete("/cycles/{cycle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cycle(
    cycle_id: int, service: TwelveWeekService = Depends(get_service)
):
    await service.delete_draft(cycle_id)


@router.put("/cycles/{cycle_id}/workbook", response_model=CycleDetail)
async def save_workbook(
    cycle_id: int,
    data: WorkbookUpdate,
    service: TwelveWeekService = Depends(get_service),
):
    return await detail_response(
        service, await service.save_workbook(cycle_id, data.answers)
    )


@router.post("/cycles/{cycle_id}/transition/{action}", response_model=CycleDetail)
async def transition_cycle(
    cycle_id: int, action: str, service: TwelveWeekService = Depends(get_service)
):
    return await detail_response(service, await service.transition(cycle_id, action))


@router.post("/cycles/{cycle_id}/goals", response_model=CycleDetail)
async def create_goal(
    cycle_id: int, data: GoalWrite, service: TwelveWeekService = Depends(get_service)
):
    return await detail_response(service, await service.create_goal(cycle_id, data))


@router.put("/cycles/{cycle_id}/goals/{goal_id}", response_model=CycleDetail)
async def update_goal(
    cycle_id: int,
    goal_id: int,
    data: GoalWrite,
    service: TwelveWeekService = Depends(get_service),
):
    return await detail_response(
        service, await service.update_goal(cycle_id, goal_id, data)
    )


@router.delete("/cycles/{cycle_id}/goals/{goal_id}", response_model=CycleDetail)
async def delete_goal(
    cycle_id: int, goal_id: int, service: TwelveWeekService = Depends(get_service)
):
    return await detail_response(service, await service.delete_goal(cycle_id, goal_id))


@router.post("/cycles/{cycle_id}/goals/{goal_id}/tactics", response_model=CycleDetail)
async def create_tactic(
    cycle_id: int,
    goal_id: int,
    data: TacticWrite,
    service: TwelveWeekService = Depends(get_service),
):
    return await detail_response(
        service, await service.create_tactic(cycle_id, goal_id, data)
    )


@router.put("/cycles/{cycle_id}/tactics/{tactic_id}", response_model=CycleDetail)
async def update_tactic(
    cycle_id: int,
    tactic_id: int,
    data: TacticWrite,
    service: TwelveWeekService = Depends(get_service),
):
    return await detail_response(
        service, await service.update_tactic(cycle_id, tactic_id, data)
    )


@router.delete("/cycles/{cycle_id}/tactics/{tactic_id}", response_model=CycleDetail)
async def delete_tactic(
    cycle_id: int, tactic_id: int, service: TwelveWeekService = Depends(get_service)
):
    return await detail_response(
        service, await service.delete_tactic(cycle_id, tactic_id)
    )


@router.put(
    "/cycles/{cycle_id}/occurrences/{occurrence_id}", response_model=CycleDetail
)
async def update_occurrence(
    cycle_id: int,
    occurrence_id: int,
    data: OccurrenceUpdate,
    service: TwelveWeekService = Depends(get_service),
):
    return await detail_response(
        service, await service.update_occurrence(cycle_id, occurrence_id, data)
    )


@router.put("/cycles/{cycle_id}/weeks/{number}/review", response_model=CycleDetail)
async def save_review(
    cycle_id: int,
    number: int,
    data: WeekReviewUpdate,
    service: TwelveWeekService = Depends(get_service),
):
    return await detail_response(
        service, await service.save_week_review(cycle_id, number, data)
    )


@router.post(
    "/cycles/{cycle_id}/weeks/{number}/transition/{action}",
    response_model=CycleDetail,
)
async def transition_week(
    cycle_id: int,
    number: int,
    action: str,
    service: TwelveWeekService = Depends(get_service),
):
    if action not in {"finalize", "reopen"}:
        raise ValidationError("Unknown week transition")
    cycle = await (
        service.finalize_week(cycle_id, number)
        if action == "finalize"
        else service.reopen_week(cycle_id, number)
    )
    return await detail_response(service, cycle)


@router.post("/cycles/{cycle_id}/model-blocks", response_model=CycleDetail)
async def create_model_block(
    cycle_id: int,
    data: ModelBlockWrite,
    service: TwelveWeekService = Depends(get_service),
):
    return await detail_response(
        service, await service.create_model_block(cycle_id, data)
    )


@router.delete("/cycles/{cycle_id}/model-blocks/{block_id}", response_model=CycleDetail)
async def delete_model_block(
    cycle_id: int, block_id: int, service: TwelveWeekService = Depends(get_service)
):
    return await detail_response(
        service, await service.delete_model_block(cycle_id, block_id)
    )


@router.post(
    "/cycles/{cycle_id}/weeks/{number}/apply-model-week", response_model=CycleDetail
)
async def apply_model_week(
    cycle_id: int, number: int, service: TwelveWeekService = Depends(get_service)
):
    return await detail_response(
        service, await service.apply_model_week(cycle_id, number)
    )
