"""Versioned cloud-model rates used for immutable per-request cost estimates."""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

PRICE_VERSION = "2026-09-26"
_MILLION = Decimal(1_000_000)
_COST_QUANTUM = Decimal("0.0000000001")


@dataclass(frozen=True)
class TokenRates:
    input_per_million_usd: Decimal
    cached_input_per_million_usd: Decimal
    output_per_million_usd: Decimal


# Rates are standard API prices per one million tokens, verified against the
# official model pages on PRICE_VERSION:
# https://developers.openai.com/api/docs/models/gpt-5-mini
# https://developers.openai.com/api/docs/models/text-embedding-3-small
# Each request stores a copy of its rates, so catalog changes do not rewrite history.
_OPENAI_COMPLETION_RATES: dict[str, TokenRates] = {
    "gpt-5-mini": TokenRates(Decimal("0.25"), Decimal("0.025"), Decimal("2.00")),
}
_OPENAI_EMBEDDING_RATES: dict[str, TokenRates] = {
    "text-embedding-3-small": TokenRates(
        Decimal("0.02"), Decimal("0.02"), Decimal(0)
    ),
}


def rates_for(provider: str, model: str, request_kind: str) -> TokenRates | None:
    """Return a known standard rate, accepting dated snapshots of known models."""
    if provider != "openai":
        return None
    catalog = (
        _OPENAI_EMBEDDING_RATES
        if request_kind == "embedding"
        else _OPENAI_COMPLETION_RATES
    )
    exact = catalog.get(model)
    if exact:
        return exact
    return next(
        (rate for name, rate in catalog.items() if model.startswith(f"{name}-")),
        None,
    )


def estimate_cost(
    rates: TokenRates,
    *,
    input_tokens: int,
    cached_input_tokens: int,
    output_tokens: int,
) -> Decimal:
    """Estimate standard token cost, charging cached input at its lower rate."""
    cached = min(max(cached_input_tokens, 0), max(input_tokens, 0))
    uncached = max(input_tokens - cached, 0)
    cost = (
        Decimal(uncached) * rates.input_per_million_usd
        + Decimal(cached) * rates.cached_input_per_million_usd
        + Decimal(max(output_tokens, 0)) * rates.output_per_million_usd
    ) / _MILLION
    return cost.quantize(_COST_QUANTUM, rounding=ROUND_HALF_UP)
