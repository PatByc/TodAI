"""Integration coverage for the 12 Week Year workspace."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_cycle_goal_tactic_scoring_and_export(async_client: AsyncClient):
    invalid = await async_client.post(
        "/api/v1/plan/12-week/cycles",
        json={"title": "Wrong day", "start_date": "2026-10-06"},
    )
    assert invalid.status_code == 422

    created = await async_client.post(
        "/api/v1/plan/12-week/cycles",
        json={
            "title": "Autumn cycle",
            "start_date": "2026-10-05",
            "timezone": "Europe/Warsaw",
        },
    )
    assert created.status_code == 201
    cycle = created.json()
    assert cycle["end_date"] == "2026-12-27"
    assert len(cycle["weeks"]) == 12

    saved = await async_client.put(
        f"/api/v1/plan/12-week/cycles/{cycle['id']}/workbook",
        json={"answers": {"aspirational_vision": "Live deliberately"}},
    )
    assert saved.status_code == 200

    goal_response = await async_client.post(
        f"/api/v1/plan/12-week/cycles/{cycle['id']}/goals",
        json={
            "position": 1,
            "title": "Ship the product",
            "success_criteria": "A stable release is in users' hands",
            "mind_map": ["Research", "Build", "Launch"],
        },
    )
    assert goal_response.status_code == 200
    goal = goal_response.json()["goals"][0]

    tactic_response = await async_client.post(
        f"/api/v1/plan/12-week/cycles/{cycle['id']}/goals/{goal['id']}/tactics",
        json={
            "position": 1,
            "title": "Complete the weekly release",
            "due_weeks": [1, 2],
            "rule_kind": "manual",
        },
    )
    assert tactic_response.status_code == 200
    occurrence = tactic_response.json()["weeks"][0]["occurrences"][0]

    checked = await async_client.put(
        f"/api/v1/plan/12-week/cycles/{cycle['id']}/occurrences/{occurrence['id']}",
        json={"completed": True, "note": "Shipped"},
    )
    assert checked.status_code == 200
    assert checked.json()["weeks"][0]["occurrences"][0]["completed"] is True

    activated = await async_client.post(
        f"/api/v1/plan/12-week/cycles/{cycle['id']}/transition/activate"
    )
    assert activated.status_code == 200
    finalized = await async_client.post(
        f"/api/v1/plan/12-week/cycles/{cycle['id']}/weeks/1/transition/finalize"
    )
    assert finalized.status_code == 200
    assert finalized.json()["weeks"][0]["score"] == 100

    exported = (await async_client.get("/api/v1/export/?format=json")).json()
    assert exported["twelve_week_cycles"][0]["title"] == "Autumn cycle"


@pytest.mark.asyncio
async def test_model_week_materializes_once(async_client: AsyncClient):
    cycle = (
        await async_client.post(
            "/api/v1/plan/12-week/cycles",
            json={"title": "Calendar cycle", "start_date": "2026-10-05"},
        )
    ).json()
    block = await async_client.post(
        f"/api/v1/plan/12-week/cycles/{cycle['id']}/model-blocks",
        json={
            "weekday": 0,
            "starts_at": "09:00:00",
            "duration_minutes": 180,
            "kind": "strategic",
            "title": "Strategic block",
        },
    )
    assert block.status_code == 200
    for _ in range(2):
        applied = await async_client.post(
            f"/api/v1/plan/12-week/cycles/{cycle['id']}/weeks/1/apply-model-week"
        )
        assert applied.status_code == 200
    planned = await async_client.get(
        "/api/v1/plan/blocks",
        params={"from_at": "2026-10-05T00:00:00", "to_at": "2026-10-12T00:00:00"},
    )
    assert len(planned.json()) == 1
    assert planned.json()[0]["block_kind"] == "strategic"
