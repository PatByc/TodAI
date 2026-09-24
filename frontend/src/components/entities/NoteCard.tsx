/**
 * Card component for note list items.
 * Displays configurable note details while keeping the title always visible.
 */

import { Link } from "@tanstack/react-router"
import { formatRelativeTime, truncateText } from "@/lib/format"
import { TagBadge } from "./TagBadge"
import type { Note } from "@/types/entities"
import type { NoteDisplayField } from "@/components/notes/NoteDisplayOptions"

interface NoteCardProps {
  note: Note
  displayFields: NoteDisplayField[]
}

export function NoteCard({ note, displayFields }: NoteCardProps) {
  const excerpt = truncateText(note.content_text, 80)
  const relativeTime = formatRelativeTime(note.updated_at)
  const shows = (field: NoteDisplayField) => displayFields.includes(field)
  const showIndicators = (shows("tags") && note.tags.length > 0)
    || (shows("pinned") && note.pinned)
  const showMeta = shows("updated") || (shows("archived") && Boolean(note.archived_at))

  return (
    <Link
      to="/notes/$noteId"
      params={{ noteId: String(note.id) }}
      className="entity-list-card"
    >
      <div className="entity-card-content">
        {/* Title row */}
        <div className="entity-card-title-row">
          <span className="entity-card-title">
            {note.title}
          </span>
          {showIndicators && (
            <div className="entity-card-indicators">
              {shows("tags") && note.tags.map((tag) => <TagBadge key={tag.id} tag={tag} />)}
              {shows("pinned") && note.pinned && <span className="entity-card-pin-state">Pinned</span>}
            </div>
          )}
        </div>

        {/* Excerpt */}
        {shows("preview") && excerpt && (
          <p className="entity-card-preview">{excerpt}</p>
        )}

        {showMeta && (
          <div className="entity-card-meta">
            {shows("archived") && note.archived_at && <span className="entity-card-archived">Archived</span>}
            {shows("updated") && <span>Updated {relativeTime}</span>}
          </div>
        )}
      </div>
    </Link>
  )
}
