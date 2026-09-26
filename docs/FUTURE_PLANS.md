# Future Plans

Planned product work intentionally deferred from the current implementation
sequence.

## Complete backup and migration workflows

TodAI Desktop can create, verify, download, schedule, retain, and restore
consistent SQLite snapshots. Restore accepts a stored snapshot or upload,
validates its identity and schema, requires explicit confirmation, applies on
restart, preserves one pre-restore safety copy, and rolls back automatically if
replacement or migration fails. The remaining work expands this safe recovery
foundation into a broader migration system.

### TodAI Server backup and recovery

Treat server backup and recovery as a separate infrastructure feature rather
than extending the Desktop SQLite controls. The implementation needs to account
for self-hosted PostgreSQL and managed providers without presenting PostgreSQL
exports as interchangeable SQLite snapshots.

- Define supported PostgreSQL backup methods for self-hosted and managed
  deployments.
- Add provider-aware configuration and capability detection.
- Support scheduled logical or physical backups without exposing database
  credentials in the TodAI interface or logs.
- Define encrypted off-machine storage, retention, and deletion policies.
- Add backup health, age, size, and verification reporting.
- Provide a guarded restore runbook with maintenance mode, validation, rollback,
  and recovery-point expectations.
- Test restores against an isolated database before marking a backup usable.
- Document operator responsibility boundaries for TodAI Server, cloud database
  providers, and the TodAI application.

## Complete semantic search

TodAI already has the semantic-search foundation: document chunking, OpenAI
embedding generation, stored vectors, SQLite and PostgreSQL vector retrieval,
hybrid result merging, incremental reindexing, and a full rebuild endpoint.
The feature is disabled by default and still needs a complete user-facing
setup and maintenance workflow.

### Activation and configuration

- Add semantic-search settings instead of requiring `.env` edits.
- Allow embeddings to be enabled or disabled independently from Tod's chat
  model.
- Show the configured provider, embedding model, dimensions, and availability.
- Validate provider credentials before starting an index build.
- Explain that generating and refreshing cloud embeddings can create API cost.

### Index lifecycle

- Offer an explicit **Build semantic index** action for existing workspace
  content.
- Show indexed and unindexed entry/chunk counts, embedding model versions, last
  successful build time, and current health.
- Stream or poll rebuild progress without blocking the rest of the application.
- Support cancellation, safe retry, and recovery from partial provider failure.
- Detect model or dimension changes and clearly require a compatible rebuild.
- Estimate the amount of content and likely request cost before a cloud rebuild.

### Search experience

- Keep keyword search available while semantic indexing is disabled, incomplete,
  or temporarily unavailable.
- Identify whether a result matched by keyword, semantic similarity, or both
  without adding visual noise.
- Verify ranking quality with representative workspace searches before enabling
  semantic retrieval by default.
- Add optional local embedding providers later for offline and privacy-sensitive
  use.

## Images and file attachments

Allow images to be embedded in notes, with the attachment system designed for
later reuse by tasks, ideas, projects, and Tod conversations.

### Initial scope

- Upload images from the editor toolbar, clipboard paste, or drag and drop.
- Display and resize images inside Tiptap notes.
- Store image metadata and binary content in a dedicated attachment model.
- Reference attachments from Tiptap JSON by stable attachment ID or API URL;
  never embed base64 image data directly in note content.
- Validate file type and size, with an initial per-image limit around 10 MB.
- Remove unreferenced files safely when their owning content is permanently
  deleted.

### Storage direction

- In Desktop mode, store attachment BLOBs in SQLite to preserve TodAI's simple,
  portable single-database-file model.
- Keep storage behind a shared attachment service so TodAI Server can later use
  filesystem or object storage without changing editor content or API contracts.
- Ensure exports and backups include attachment data.

### Later extensions

- Generate thumbnails and optimize oversized images.
- Support other files such as PDFs, documents, audio, and video.
- Let vision-capable Tod models inspect images and optionally extract searchable
  text, descriptions, and metadata.
- Expose the same attachment interface across all entry types.
