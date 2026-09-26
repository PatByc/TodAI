"""Integration coverage for the daily Review aggregation."""

from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.audit_log import AuditLog
from app.models.time_tracking import TimeEntry
from app.schemas.review import ReviewReflectionLocator
from app.services import review_service
from app.services.review_reflection_service import ReviewReflectionService


@pytest.mark.asyncio
async def test_daily_review_combines_time_tasks_and_routines(
    async_client: AsyncClient, async_session
):
    stream = (
        await async_client.post("/api/v1/time/streams", json={"name": "Focus", "color_index": 4})
    ).json()
    await async_client.post(
        "/api/v1/plan/blocks",
        json={
            "title": "Late plan",
            "starts_at": "2026-09-23T21:30:00Z",
            "ends_at": "2026-09-23T22:30:00Z",
            "stream_id": stream["id"],
        },
    )
    await async_client.post(
        "/api/v1/time/entries",
        json={
            "started_at": "2026-09-23T21:45:00Z",
            "ended_at": "2026-09-23T22:15:00Z",
            "stream_id": stream["id"],
        },
    )

    routine = (
        await async_client.post(
            "/api/v1/plan/routines",
            json={"title": "Review notes", "weekdays": [3], "scheduled_time": "18:00"},
        )
    ).json()
    await async_client.put(
        f"/api/v1/plan/routines/{routine['id']}/completion",
        json={"completed_on": "2026-09-24", "completed": True},
    )

    completed_task = (
        await async_client.post(
            "/api/v1/tasks/",
            json={"title": "Publish", "deadline": "2026-09-24T10:00:00Z"},
        )
    ).json()
    await async_client.put(
        f"/api/v1/tasks/{completed_task['id']}", json={"status": "done"}
    )
    open_task = (
        await async_client.post(
            "/api/v1/tasks/",
            json={"title": "Follow up", "deadline": "2026-09-24T15:00:00Z"},
        )
    ).json()

    audits = list((await async_session.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == "task")
        .order_by(AuditLog.entity_id, AuditLog.id)
    )).scalars())
    for audit in audits:
        if audit.entity_id == completed_task["id"]:
            audit.created_at = datetime.fromisoformat(
                "2026-09-23T08:00:00" if audit.action == "create" else "2026-09-24T09:00:00"
            )
        elif audit.entity_id == open_task["id"]:
            audit.created_at = datetime.fromisoformat("2026-09-23T08:30:00")
    await async_session.commit()

    response = await async_client.get(
        "/api/v1/review/day",
        params={"date": "2026-09-24", "timezone": "Europe/Warsaw"},
    )
    assert response.status_code == 200
    review = response.json()
    assert review["time"] == {
        "planned_seconds": 1800,
        "tracked_seconds": 900,
        "variance_seconds": -900,
    }
    assert review["streams"][0]["name"] == "Focus"
    assert review["streams"][0]["color_index"] == 4
    assert review["tasks"]["completed_count"] == 1
    assert review["tasks"]["completed"][0]["title"] == "Publish"
    assert review["tasks"]["unfinished_count"] == 1
    assert review["tasks"]["unfinished"][0]["title"] == "Follow up"
    assert review["routines"]["scheduled_count"] == 1
    assert review["routines"]["completed_count"] == 1
    assert review["routines"]["completion_rate"] == 100.0


@pytest.mark.asyncio
async def test_reflection_is_saved_once_per_review_period(async_client: AsyncClient):
    params = {
        "scope": "day",
        "start_date": "2026-09-24",
        "end_date": "2026-09-24",
        "timezone": "Europe/Warsaw",
    }
    empty = await async_client.get("/api/v1/review/reflection", params=params)
    assert empty.status_code == 200
    assert empty.json() is None

    created = await async_client.put(
        "/api/v1/review/reflection",
        json={
            **params,
            "what_worked": "I protected a focus block.",
            "friction": "Two tasks remained open.",
            "adjustment": "I will plan fewer parallel tasks.",
            "patterns": [
                {
                    "text": "Possible signal: planning is ahead of tracking.",
                    "evidence": "Tracked time was below planned time.",
                }
            ],
        },
    )
    assert created.status_code == 200
    reflection_id = created.json()["id"]

    updated = await async_client.put(
        "/api/v1/review/reflection",
        json={
            **params,
            "what_worked": "I protected two focus blocks.",
            "friction": "",
            "adjustment": "Start with one priority.",
            "patterns": [],
        },
    )
    assert updated.status_code == 200
    assert updated.json()["id"] == reflection_id
    assert updated.json()["what_worked"] == "I protected two focus blocks."

    loaded = await async_client.get("/api/v1/review/reflection", params=params)
    assert loaded.json()["id"] == reflection_id
    assert loaded.json()["adjustment"] == "Start with one priority."

    exported = (await async_client.get("/api/v1/export/?format=json")).json()
    assert exported["review_reflections"][0]["id"] == reflection_id


@pytest.mark.asyncio
async def test_reflection_rejects_non_calendar_week(async_client: AsyncClient):
    response = await async_client.put(
        "/api/v1/review/reflection",
        json={
            "scope": "week",
            "start_date": "2026-09-22",
            "end_date": "2026-09-28",
            "timezone": "UTC",
        },
    )
    assert response.status_code == 409
    assert "Monday through Sunday" in response.json()["detail"]


@pytest.mark.asyncio
async def test_tod_reflection_draft_uses_three_review_periods(async_session):
    class DraftProvider:
        def __init__(self):
            self.prompt = ""

        async def complete(self, prompt: str) -> str:
            self.prompt = prompt
            return """{
                "what_worked": "I completed the work I closed.",
                "friction": "Tracked time was limited.",
                "adjustment": "I will protect one focused block.",
                "patterns": [{
                    "text": "Possible signal: tracking is inconsistent.",
                    "evidence": "The three snapshots contain little tracked time."
                }]
            }"""

    provider = DraftProvider()
    service = ReviewReflectionService(async_session, provider=provider)
    draft = await service.draft(
        ReviewReflectionLocator(
            scope="day",
            start_date="2026-09-24",
            end_date="2026-09-24",
            timezone="UTC",
        )
    )

    assert draft.adjustment == "I will protect one focused block."
    assert len(draft.patterns) == 1
    assert provider.prompt.count('"start_date"') == 3
    assert "only when the same tendency is supported across all three" in provider.prompt


@pytest.mark.asyncio
async def test_daily_review_keeps_past_completion_after_task_is_reopened(
    async_client: AsyncClient, async_session
):
    task = (
        await async_client.post("/api/v1/tasks/", json={"title": "Reopen me"})
    ).json()
    await async_client.put(f"/api/v1/tasks/{task['id']}", json={"status": "done"})
    await async_client.put(f"/api/v1/tasks/{task['id']}", json={"status": "todo"})

    audits = list((await async_session.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == "task", AuditLog.entity_id == task["id"])
        .order_by(AuditLog.id)
    )).scalars())
    timestamps = [
        "2026-09-20T08:00:00",
        "2026-09-21T12:00:00",
        "2026-09-22T08:00:00",
    ]
    for audit, timestamp in zip(audits, timestamps, strict=True):
        audit.created_at = datetime.fromisoformat(timestamp)
    await async_session.commit()

    monday = (
        await async_client.get(
            "/api/v1/review/day",
            params={"date": "2026-09-21", "timezone": "UTC"},
        )
    ).json()
    tuesday = (
        await async_client.get(
            "/api/v1/review/day",
            params={"date": "2026-09-22", "timezone": "UTC"},
        )
    ).json()
    assert monday["tasks"]["completed_count"] == 1
    assert tuesday["tasks"]["completed_count"] == 0


@pytest.mark.asyncio
async def test_daily_review_rejects_unknown_timezone(async_client: AsyncClient):
    response = await async_client.get(
        "/api/v1/review/day",
        params={"date": "2026-09-24", "timezone": "Mars/Olympus"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Unknown timezone 'Mars/Olympus'"


@pytest.mark.asyncio
async def test_running_timer_is_clipped_to_now_and_excluded_from_future(
    async_client: AsyncClient, async_session, monkeypatch
):
    class FixedDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            value = cls(2026, 9, 25, 10, 0, tzinfo=UTC)
            return value if tz else value.replace(tzinfo=None)

    monkeypatch.setattr(review_service, "datetime", FixedDateTime)
    async_session.add(
        TimeEntry(
            started_at=datetime(2026, 9, 25, 8, 0, tzinfo=UTC).replace(tzinfo=None),
            ended_at=None,
        )
    )
    await async_session.commit()

    today = (
        await async_client.get(
            "/api/v1/review/day",
            params={"date": "2026-09-25", "timezone": "UTC"},
        )
    ).json()
    future = (
        await async_client.get(
            "/api/v1/review/day",
            params={"date": "2026-09-26", "timezone": "UTC"},
        )
    ).json()
    assert today["time"]["tracked_seconds"] == 7200
    assert today["streams"][0]["name"] == "Unassigned"
    assert future["time"]["tracked_seconds"] == 0
    assert future["streams"] == []


@pytest.mark.asyncio
async def test_weekly_review_anchors_to_monday_and_compares_previous_week(
    async_client: AsyncClient, async_session
):
    stream = (
        await async_client.post(
            "/api/v1/time/streams", json={"name": "Studio", "color_index": 8}
        )
    ).json()
    for title, start, end in [
        ("Monday plan", "2026-09-21T08:00:00Z", "2026-09-21T10:00:00Z"),
        ("Tuesday plan", "2026-09-22T08:00:00Z", "2026-09-22T09:00:00Z"),
    ]:
        await async_client.post(
            "/api/v1/plan/blocks",
            json={
                "title": title,
                "starts_at": start,
                "ends_at": end,
                "stream_id": stream["id"],
            },
        )
    for start, end in [
        ("2026-09-14T08:00:00Z", "2026-09-14T08:30:00Z"),
        ("2026-09-21T08:00:00Z", "2026-09-21T09:00:00Z"),
    ]:
        await async_client.post(
            "/api/v1/time/entries",
            json={"started_at": start, "ended_at": end, "stream_id": stream["id"]},
        )

    routine = (
        await async_client.post(
            "/api/v1/plan/routines",
            json={"title": "Plan day", "weekdays": [0, 1]},
        )
    ).json()
    await async_client.put(
        f"/api/v1/plan/routines/{routine['id']}/completion",
        json={"completed_on": "2026-09-21", "completed": True},
    )

    task = (
        await async_client.post(
            "/api/v1/tasks/",
            json={"title": "Ship review", "deadline": "2026-09-22T17:00:00Z"},
        )
    ).json()
    await async_client.put(f"/api/v1/tasks/{task['id']}", json={"status": "done"})
    task_audits = list(
        (
            await async_session.execute(
                select(AuditLog)
                .where(
                    AuditLog.entity_type == "task",
                    AuditLog.entity_id == task["id"],
                )
                .order_by(AuditLog.id)
            )
        ).scalars()
    )
    task_audits[0].created_at = datetime.fromisoformat("2026-09-20T10:00:00")
    task_audits[1].created_at = datetime.fromisoformat("2026-09-22T12:00:00")
    await async_session.commit()

    response = await async_client.get(
        "/api/v1/review/week",
        params={"date": "2026-09-24", "timezone": "UTC"},
    )
    assert response.status_code == 200
    review = response.json()
    assert review["week_start"] == "2026-09-21"
    assert review["week_end"] == "2026-09-27"
    assert len(review["days"]) == 7
    assert review["time"]["planned_seconds"] == 10_800
    assert review["time"]["tracked_seconds"] == 3_600
    assert review["streams"][0]["name"] == "Studio"
    assert review["tasks"]["completed_count"] == 1
    assert review["routines"]["scheduled_count"] == 2
    assert review["routines"]["completed_count"] == 1
    assert review["routines"]["completion_rate"] == 50.0
    assert review["days"][0]["tracked_seconds"] == 3_600
    assert review["days"][1]["completed_tasks"] == 1
    assert review["comparison"]["tracked_delta_seconds"] == 1_800


@pytest.mark.asyncio
async def test_custom_period_review_uses_inclusive_dates_and_equal_comparison(
    async_client: AsyncClient,
):
    for start, end in [
        ("2026-09-17T08:00:00Z", "2026-09-17T08:30:00Z"),
        ("2026-09-21T08:00:00Z", "2026-09-21T09:00:00Z"),
        ("2026-09-23T08:00:00Z", "2026-09-23T10:00:00Z"),
    ]:
        await async_client.post(
            "/api/v1/time/entries",
            json={"started_at": start, "ended_at": end},
        )

    response = await async_client.get(
        "/api/v1/review/period",
        params={
            "start_date": "2026-09-21",
            "end_date": "2026-09-23",
            "timezone": "UTC",
        },
    )
    assert response.status_code == 200
    review = response.json()
    assert review["start_date"] == "2026-09-21"
    assert review["end_date"] == "2026-09-23"
    assert len(review["days"]) == 3
    assert review["time"]["tracked_seconds"] == 10_800
    assert review["comparison"]["previous_start_date"] == "2026-09-18"
    assert review["comparison"]["previous_end_date"] == "2026-09-20"
    assert review["comparison"]["tracked_delta_seconds"] == 10_800

    invalid = await async_client.get(
        "/api/v1/review/period",
        params={
            "start_date": "2026-09-24",
            "end_date": "2026-09-21",
        },
    )
    assert invalid.status_code == 409


@pytest.mark.asyncio
async def test_monthly_review_uses_calendar_month_boundaries(
    async_client: AsyncClient,
):
    for start, end in [
        ("2026-01-31T08:00:00Z", "2026-01-31T08:30:00Z"),
        ("2026-02-01T08:00:00Z", "2026-02-01T09:00:00Z"),
    ]:
        await async_client.post(
            "/api/v1/time/entries",
            json={"started_at": start, "ended_at": end},
        )

    response = await async_client.get(
        "/api/v1/review/month",
        params={"date": "2026-02-18", "timezone": "UTC"},
    )
    assert response.status_code == 200
    review = response.json()
    assert review["start_date"] == "2026-02-01"
    assert review["end_date"] == "2026-02-28"
    assert len(review["days"]) == 28
    assert review["time"]["tracked_seconds"] == 3600
    assert review["comparison"]["previous_start_date"] == "2026-01-01"
    assert review["comparison"]["previous_end_date"] == "2026-01-31"
    assert review["comparison"]["tracked_delta_seconds"] == 1800
