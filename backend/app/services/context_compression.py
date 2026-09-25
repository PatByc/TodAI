"""Bounded, fail-open context compression backed by Headroom's Python core."""

from __future__ import annotations

import asyncio
import json
import re
from collections.abc import Iterable
from typing import Any

from app.config import settings
from app.services.ai_settings_service import context_compression_enabled
from app.services.efficiency_service import record_compression

_CCR_MARKER = re.compile(
    r"Retrieve (?:more|original): hash=|<<ccr:[^>]+>>|HEADROOM_BATCH_CCR",
    re.IGNORECASE,
)
_PROTECTED_KEYS = {
    "id",
    "entity_id",
    "entity_type",
    "source_number",
    "number",
    "tool_name",
    "url",
}


def _estimate_tokens(value: str) -> int:
    return max(1, (len(value) + 3) // 4)


def _bounded(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    head = limit * 2 // 3
    tail = limit - head
    return f"{value[:head]}\n… context clipped …\n{value[-tail:]}"


def _compress_sync(content: str, query: str) -> tuple[str, int, int]:
    from headroom import CompressConfig, compress

    result = compress(
        [
            {"role": "system", "content": content},
            {"role": "user", "content": query or "Keep relevant context."},
        ],
        model=settings.completion_model,
        config=CompressConfig(
            compress_user_messages=False,
            compress_system_messages=True,
            protect_recent=1,
            protect_analysis_context=True,
            target_ratio=0.7,
            min_tokens_to_compress=settings.context_compression_min_tokens,
        ),
    )
    compressed = result.messages[0].get("content", content)
    if not isinstance(compressed, str):
        compressed = json.dumps(compressed, ensure_ascii=False, separators=(",", ":"))
    return compressed, result.tokens_before, result.tokens_after


async def compress_context(content: str, query: str, *, record: bool = True) -> str:
    """Compress long context, rejecting retrieval-dependent or inflated output."""
    estimated = _estimate_tokens(content)
    if (
        not context_compression_enabled()
        or estimated < settings.context_compression_min_tokens
    ):
        return content
    try:
        compressed, before, after = await asyncio.to_thread(
            _compress_sync, content, query
        )
        before = before or estimated
        after = after or _estimate_tokens(compressed)
        if not compressed.strip() or _CCR_MARKER.search(compressed) or after >= before:
            if record:
                record_compression(before, before)
            return content
        if record:
            record_compression(before, after)
        return compressed
    except Exception:  # noqa: BLE001 - compression must never break an AI request
        if record:
            record_compression(estimated, estimated, failed=True)
        return content


def _protected_values(value: Any) -> dict[str, list[str]]:
    protected: dict[str, list[str]] = {}

    def visit(item: Any) -> None:
        if isinstance(item, dict):
            for key, child in item.items():
                if key in _PROTECTED_KEYS:
                    protected.setdefault(key, []).append(str(child))
                visit(child)
        elif isinstance(item, list):
            for child in item:
                visit(child)

    visit(value)
    return protected


async def compress_tool_payload(value: Any, query: str) -> str:
    """Compress a tool result while preserving identifiers and valid JSON."""
    original = json.dumps(value, ensure_ascii=False, default=str, separators=(",", ":"))
    compressed = await compress_context(original, query, record=False)
    if compressed == original:
        record_compression(_estimate_tokens(original), _estimate_tokens(original))
        return original
    try:
        decoded = json.loads(compressed)
    except (TypeError, ValueError):
        record_compression(_estimate_tokens(original), _estimate_tokens(original))
        return original
    if _protected_values(decoded) != _protected_values(value):
        record_compression(_estimate_tokens(original), _estimate_tokens(original))
        return original
    record_compression(_estimate_tokens(original), _estimate_tokens(compressed))
    return compressed


async def compress_source_context(content: str, query: str) -> str:
    """Compress cited source blocks only when every citation label survives."""
    citations = set(re.findall(r"(?m)^\[(\d+)\]", content))
    compressed = await compress_context(content, query, record=False)
    if compressed == content:
        record_compression(_estimate_tokens(content), _estimate_tokens(content))
        return content
    if set(re.findall(r"(?m)^\[(\d+)\]", compressed)) != citations:
        record_compression(_estimate_tokens(content), _estimate_tokens(content))
        return content
    record_compression(_estimate_tokens(content), _estimate_tokens(compressed))
    return compressed


async def prepare_history(turns: Iterable[Any], query: str) -> str:
    """Bound recent history deterministically, then compress it when worthwhile."""
    selected = list(turns)[-6:]
    full = "\n".join(
        f"{getattr(turn, 'role', 'user')}: {getattr(turn, 'content', '')}"
        for turn in selected
    )
    rendered: list[str] = []
    for turn in selected:
        role = getattr(turn, "role", "user")
        content = _bounded(str(getattr(turn, "content", "")), 4_000)
        rendered.append(f"{role}: {content}")
    history = _bounded("\n".join(rendered), settings.context_history_max_chars)
    if len(history) < len(full):
        record_compression(_estimate_tokens(full), _estimate_tokens(history))
    return await compress_context(history, query) if history else ""
