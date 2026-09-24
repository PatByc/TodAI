# Future Ideas

Ideas collected for later planning. These are not committed release requirements.

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
