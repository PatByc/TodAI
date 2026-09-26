"""Efficiency telemetry remains content-free and compression remains fail-open."""

import json
from decimal import Decimal

import pytest
from httpx import AsyncClient

from app.services import ai_settings_service, context_compression
from app.services.api_pricing import TokenRates, estimate_cost
from app.services.efficiency_service import (
    measure_operation,
    record_completion_usage,
)


@pytest.mark.asyncio
async def test_developer_metrics_aggregate_measured_operation(
    async_client: AsyncClient, async_session
):
    usage = type(
        "Usage",
        (),
        {
            "input_tokens": 120,
            "output_tokens": 30,
            "input_tokens_details": type("Details", (), {"cached_tokens": 20})(),
        },
    )()
    response = type("Response", (), {"usage": usage})()
    async with measure_operation(async_session, "test_ai"):
        record_completion_usage(response, "test-model", session=async_session)

    result = await async_client.get("/api/v1/developer/metrics", params={"days": 7})

    assert result.status_code == 200
    payload = result.json()
    assert payload["summary"]["operations"] == 1
    assert payload["summary"]["input_tokens"] == 120
    assert payload["summary"]["cached_input_tokens"] == 20
    assert payload["recent"][0]["operation"] == "test_ai"
    assert "content" not in payload["recent"][0]

    costs = await async_client.get("/api/v1/developer/costs", params={"days": 7})
    assert costs.status_code == 200
    cost_payload = costs.json()
    assert cost_payload["summary"]["requests"] == 1
    assert cost_payload["summary"]["unpriced_requests"] == 1
    assert cost_payload["recent"][0]["model"] == "test-model"
    assert cost_payload["recent"][0]["estimated_cost_usd"] is None


def test_cost_estimate_uses_cached_input_rate():
    rates = TokenRates(
        input_per_million_usd=Decimal(1),
        cached_input_per_million_usd=Decimal("0.1"),
        output_per_million_usd=Decimal(5),
    )

    result = estimate_cost(
        rates,
        input_tokens=1_000_000,
        cached_input_tokens=200_000,
        output_tokens=100_000,
    )

    assert result == Decimal("1.3200000000")


@pytest.mark.asyncio
async def test_known_model_cost_is_stored_with_rate_snapshot(
    async_client: AsyncClient, async_session
):
    usage = type(
        "Usage",
        (),
        {
            "input_tokens": 1_000,
            "output_tokens": 100,
            "input_tokens_details": type("Details", (), {"cached_tokens": 200})(),
        },
    )()
    response = type("Response", (), {"id": "resp_test", "usage": usage})()
    async with measure_operation(async_session, "agent_plan"):
        record_completion_usage(response, "gpt-5-mini", session=async_session)

    result = await async_client.get("/api/v1/developer/costs", params={"days": 7})

    assert result.status_code == 200
    payload = result.json()
    assert payload["summary"]["priced_requests"] == 1
    assert payload["summary"]["estimated_cost_usd"] == pytest.approx(0.000405)
    assert payload["by_model"][0]["provider"] == "openai"
    assert payload["recent"][0]["provider_request_id"] == "resp_test"
    assert payload["recent"][0]["pricing_version"] == "2026-09-26"


@pytest.mark.asyncio
async def test_ai_agent_compression_setting_is_persisted(
    async_client: AsyncClient, monkeypatch
):
    monkeypatch.setattr(ai_settings_service, "_context_compression_enabled", True)

    updated = await async_client.put(
        "/api/v1/settings/ai-agent",
        json={"context_compression_enabled": False},
    )
    loaded = await async_client.get("/api/v1/settings/ai-agent")

    assert updated.status_code == 200
    assert updated.json()["context_compression_enabled"] is False
    assert loaded.json()["context_compression_enabled"] is False
    assert context_compression.context_compression_enabled() is False


@pytest.mark.asyncio
async def test_tool_compression_rejects_retrieval_markers(monkeypatch):
    original = {"entity_id": 7, "content": "important " * 1_000}

    def fake_compress(content: str, query: str) -> tuple[str, int, int]:
        return "[compressed. Retrieve more: hash=abc]", 2_000, 10

    monkeypatch.setattr(context_compression, "_compress_sync", fake_compress)
    monkeypatch.setattr(
        context_compression.settings, "context_compression_min_tokens", 1
    )

    result = await context_compression.compress_tool_payload(original, "find it")

    assert json.loads(result) == original


@pytest.mark.asyncio
async def test_tool_compression_preserves_identifiers(monkeypatch):
    original = {"entity_id": 7, "content": "important " * 1_000}

    def fake_compress(content: str, query: str) -> tuple[str, int, int]:
        changed = {"entity_id": 8, "content": "short"}
        return json.dumps(changed), 2_000, 20

    monkeypatch.setattr(context_compression, "_compress_sync", fake_compress)
    monkeypatch.setattr(
        context_compression.settings, "context_compression_min_tokens", 1
    )

    result = await context_compression.compress_tool_payload(original, "find it")

    assert json.loads(result) == original
