"""OpenAI implementation of TodAI's provider contracts."""

from openai import AsyncOpenAI


class OpenAIProvider:
    """OpenAI adapter for embeddings now and completions in Ask mode."""

    def __init__(
        self,
        api_key: str,
        embedding_model: str = "text-embedding-3-small",
        embedding_dimensions: int = 1536,
        completion_model: str = "gpt-5-mini",
    ) -> None:
        self.client = AsyncOpenAI(api_key=api_key)
        self.embedding_model = embedding_model
        self.embedding_dimensions = embedding_dimensions
        self.completion_model = completion_model

    @property
    def model_version(self) -> str:
        return f"openai:{self.embedding_model}:{self.embedding_dimensions}"

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        response = await self.client.embeddings.create(
            model=self.embedding_model,
            input=texts,
            dimensions=self.embedding_dimensions,
        )
        return [item.embedding for item in response.data]

    async def complete(self, prompt: str) -> str:
        response = await self.client.responses.create(
            model=self.completion_model,
            input=prompt,
            store=False,
        )
        return response.output_text
