# Agent mode

Use the mode control at the bottom-left of Ask Tod's composer to switch from
**Query** to **Agent**. Query remains the default and is strictly read-only.

Agent can search and inspect saved Notes, Tasks, Ideas, Projects, Inbox items,
and tags. It can propose creates, updates, archiving, deletion, conversion, and
tagging. It has no shell, raw database, filesystem, or external-service tools.

## Human review

An Agent request may produce a proposal card listing every intended change and
its fields. Planning stores the proposal but does **not** change an entity. You
can approve, reject, or choose Revise and explain what should change. Revise
rejects the old proposal; Tod makes a new one from your feedback.

Proposals expire after 30 minutes and can be approved only once. Approval checks
that existing targets have not changed since the proposal; stale edits fail
instead of overwriting newer work. Successful actions pass through TodAI's
normal validation, audit log, and search indexing. If a later action in a batch
fails, earlier successful actions remain and the chat reports the partial result.

Agent uses the configured OpenAI completion model with `store=False`. It sends
the current request, limited conversation context, and relevant saved records to
the provider. A configured `OPENAI_API_KEY` is required. Without a key, Agent
does not plan or apply changes.

TodAI currently has no built-in user authentication. Do not expose the Desktop
or Server API directly to untrusted networks; add an authentication layer for
networked use before relying on Agent mode there.

The automated tests use a fake provider. A real OpenAI tool-call and browser
smoke test remain pending until an API key is configured.
