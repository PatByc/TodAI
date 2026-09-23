"""Legacy retrieval helpers retained by the unified Agent."""

import pytest

from app.models.note import Note
from app.providers.openai_provider import OpenAIProvider
from app.schemas.ask import AskRequest, AskTurn
from app.services.ask_service import AskService
from app.services.search_index_service import SearchIndexService


class FakeCompletion:
    def __init__(self, answer: str = "The venue is in Warsaw. [1]") -> None:
        self.answer = answer
        self.prompts: list[str] = []

    async def complete(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return self.answer


@pytest.mark.asyncio
async def test_retrieval_rejects_invented_citations(async_session):
    async_session.add(
        Note(title="Budget", content={"type": "doc"}, content_text="Cost is five.")
    )
    await async_session.flush()
    await SearchIndexService(async_session).rebuild()
    result = await AskService(
        async_session, provider=FakeCompletion("Unlimited. [999]")
    ).ask(AskRequest(question="Budget"))
    assert result.sources == []
    assert "couldn't verify" in result.answer


@pytest.mark.asyncio
async def test_no_match_does_not_call_completion(async_session):
    fake = FakeCompletion()
    result = await AskService(async_session, provider=fake).ask(
        AskRequest(question="Unindexed knowledge")
    )
    assert result.sources == []
    assert fake.prompts == []


@pytest.mark.asyncio
async def test_retrieval_uses_matching_chunk_and_history(async_session):
    note = Note(
        title="Travel journal",
        content={"type": "doc"},
        content_text="filler " * 200 + "Warsaw venue has the booking.",
    )
    async_session.add(note)
    await async_session.flush()
    await SearchIndexService(async_session).rebuild()
    fake = FakeCompletion("The booking is in Warsaw. [1]")
    result = await AskService(async_session, provider=fake).ask(
        AskRequest(
            question="What about it?",
            history=[AskTurn(role="user", content="Warsaw venue")],
        )
    )
    assert result.sources[0].entity_id == note.id
    assert "Warsaw venue has the booking" in fake.prompts[0]


@pytest.mark.asyncio
async def test_openai_completion_adapter_disables_storage():
    class FakeResponses:
        async def create(self, **kwargs):
            self.kwargs = kwargs
            return type("Response", (), {"output_text": "Grounded answer [1]"})()

    responses = FakeResponses()
    provider = OpenAIProvider(api_key="test-only")
    provider.client = type("Client", (), {"responses": responses})()
    assert await provider.complete("prompt") == "Grounded answer [1]"
    assert responses.kwargs["store"] is False
