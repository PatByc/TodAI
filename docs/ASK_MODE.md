# Ask Tod

In **Query** mode, Ask Tod answers questions using the content indexed from Notes,
Tasks, Ideas, Projects, and Inbox items. It retrieves relevant chunks, sends those
excerpts to the configured completion provider, and displays inline numbered
citations. Each citation opens the source entity's body section. Query mode has no
write tools or entity mutation paths. For review-gated writes, see
[Agent mode](AGENT_MODE.md).

## Enable OpenAI

In the project-root `.env` file (next to `.env.example`), set:

```env
OPENAI_API_KEY=your-key
COMPLETION_PROVIDER=openai
COMPLETION_MODEL=gpt-5-mini
```

Restart the TodAI process. `EMBEDDING_PROVIDER=openai` is optional but enables
semantic retrieval; without it, Ask uses local keyword retrieval. Existing
content can be reindexed with `POST /api/v1/search/rebuild` after enabling
embeddings. The API key is never returned by `/api/v1/ask/status`.

No API key is needed for ordinary CRUD or local search. When Ask is disabled, the
page shows configuration guidance rather than sending a request.

## Privacy and limits

OpenAI receives the latest question, up to six previous conversation turns, and
up to six retrieved source excerpts. The Responses request uses `store=False`.
Conversation history lives in browser session storage for navigation between
answers and citations; TodAI does not save chat messages to the database.

The application validates that cited source numbers came from retrieved content
and refuses to display an uncited generated answer. It cannot automatically
prove every claim in a model-generated answer, so users should open citations
when accuracy matters. The adapter is swappable through the
`CompletionProvider` protocol.
