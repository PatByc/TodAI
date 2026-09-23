"""Regression coverage for issues found in the Phase 2 code review."""

import uuid

import pytest
from httpx import AsyncClient


def _unique(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _doc(text: str) -> dict:
    return {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": text}],
            }
        ],
    }


@pytest.mark.asyncio
async def test_note_content_text_is_derived_from_content(
    async_client: AsyncClient,
):
    create_response = await async_client.post(
        "/api/v1/notes/",
        json={"title": _unique("note-text"), "content": _doc("Created text")},
    )
    assert create_response.status_code == 201
    note = create_response.json()
    assert note["content_text"] == "Created text"

    update_response = await async_client.put(
        f"/api/v1/notes/{note['id']}",
        json={"content": _doc("Updated text")},
    )
    assert update_response.status_code == 200
    assert update_response.json()["content_text"] == "Updated text"


@pytest.mark.asyncio
async def test_project_description_defaults_and_clears_cleanly(
    async_client: AsyncClient,
):
    empty_response = await async_client.post(
        "/api/v1/projects/",
        json={"name": _unique("empty-project")},
    )
    assert empty_response.status_code == 201
    assert empty_response.json()["description"] is None

    create_response = await async_client.post(
        "/api/v1/projects/",
        json={
            "name": _unique("described-project"),
            "description": _doc("Temporary description"),
        },
    )
    project = create_response.json()
    assert project["description_text"] == "Temporary description"

    clear_response = await async_client.put(
        f"/api/v1/projects/{project['id']}",
        json={"description": None},
    )
    assert clear_response.status_code == 200
    cleared = clear_response.json()
    assert cleared["description"] is None
    assert cleared["description_text"] is None


@pytest.mark.asyncio
async def test_task_filters_are_applied_before_pagination(
    async_client: AsyncClient,
):
    matching_project = (
        await async_client.post(
            "/api/v1/projects/", json={"name": _unique("task-project")}
        )
    ).json()
    other_project = (
        await async_client.post(
            "/api/v1/projects/", json={"name": _unique("other-project")}
        )
    ).json()
    tag = (
        await async_client.post("/api/v1/tags/", json={"name": _unique("task-filter")})
    ).json()

    matching_task = (
        await async_client.post(
            "/api/v1/tasks/",
            json={
                "title": _unique("matching-task"),
                "status": "backlog",
                "project_id": matching_project["id"],
                "deadline": "2030-01-01T00:00:00",
            },
        )
    ).json()
    await async_client.post(
        "/api/v1/tags/entity",
        json={
            "tag_id": tag["id"],
            "entity_type": "task",
            "entity_id": matching_task["id"],
        },
    )

    # Created later so it occupies the first unfiltered page.
    await async_client.post(
        "/api/v1/tasks/",
        json={
            "title": _unique("distractor-task"),
            "status": "backlog",
            "project_id": other_project["id"],
        },
    )

    response = await async_client.get(
        "/api/v1/tasks/",
        params={
            "status": "backlog",
            "project_id": matching_project["id"],
            "tag_ids": tag["id"],
            "limit": 1,
        },
    )
    assert response.status_code == 200
    page = response.json()
    assert page["total"] == 1
    assert [item["id"] for item in page["items"]] == [matching_task["id"]]

    clear_deadline = await async_client.put(
        f"/api/v1/tasks/{matching_task['id']}", json={"deadline": None}
    )
    assert clear_deadline.status_code == 200
    assert clear_deadline.json()["deadline"] is None

    archive_response = await async_client.patch(
        f"/api/v1/tasks/{matching_task['id']}/archive"
    )
    assert archive_response.status_code == 200

    archived_page = await async_client.get(
        "/api/v1/tasks/",
        params={
            "status": "backlog",
            "project_id": matching_project["id"],
            "include_archived": True,
        },
    )
    assert archived_page.status_code == 200
    archived_data = archived_page.json()
    assert archived_data["total"] == 1
    assert archived_data["items"][0]["id"] == matching_task["id"]


@pytest.mark.asyncio
async def test_idea_state_and_project_filters_precede_pagination(
    async_client: AsyncClient,
):
    matching_project = (
        await async_client.post(
            "/api/v1/projects/", json={"name": _unique("idea-project")}
        )
    ).json()
    other_project = (
        await async_client.post(
            "/api/v1/projects/", json={"name": _unique("idea-other")}
        )
    ).json()

    matching_idea = (
        await async_client.post(
            "/api/v1/ideas/",
            json={
                "title": _unique("matching-idea"),
                "state": "raw",
                "project_id": matching_project["id"],
            },
        )
    ).json()
    await async_client.post(
        "/api/v1/ideas/",
        json={
            "title": _unique("distractor-idea"),
            "state": "raw",
            "project_id": other_project["id"],
        },
    )

    response = await async_client.get(
        "/api/v1/ideas/",
        params={
            "state": "raw",
            "project_id": matching_project["id"],
            "limit": 1,
        },
    )
    assert response.status_code == 200
    page = response.json()
    assert page["total"] == 1
    assert [item["id"] for item in page["items"]] == [matching_idea["id"]]

    await async_client.patch(f"/api/v1/ideas/{matching_idea['id']}/archive")
    archived_response = await async_client.get(
        "/api/v1/ideas/",
        params={
            "state": "raw",
            "project_id": matching_project["id"],
            "include_archived": True,
        },
    )
    archived_page = archived_response.json()
    assert archived_page["total"] == 1
    assert archived_page["items"][0]["id"] == matching_idea["id"]


@pytest.mark.asyncio
async def test_tag_filter_precedes_note_pagination(async_client: AsyncClient):
    tag = (
        await async_client.post("/api/v1/tags/", json={"name": _unique("note-page")})
    ).json()
    matching_note = (
        await async_client.post(
            "/api/v1/notes/", json={"title": _unique("tagged-note")}
        )
    ).json()
    await async_client.post(
        "/api/v1/tags/entity",
        json={
            "tag_id": tag["id"],
            "entity_type": "note",
            "entity_id": matching_note["id"],
        },
    )
    await async_client.post(
        "/api/v1/notes/", json={"title": _unique("newer-untagged-note")}
    )

    response = await async_client.get(
        "/api/v1/notes/", params={"tag_ids": tag["id"], "limit": 1}
    )
    assert response.status_code == 200
    page = response.json()
    assert page["total"] == 1
    assert [item["id"] for item in page["items"]] == [matching_note["id"]]
