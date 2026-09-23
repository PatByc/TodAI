"""Swappable AI provider contracts used by indexing and Ask mode."""

from typing import Protocol


class EmbeddingProvider(Protocol):
    """Turns text into same-sized numeric vectors."""

    @property
    def model_version(self) -> str: ...

    async def embed(self, texts: list[str]) -> list[list[float]]: ...


class CompletionProvider(Protocol):
    """Generates text without coupling application services to an SDK."""

    async def complete(self, prompt: str) -> str: ...
