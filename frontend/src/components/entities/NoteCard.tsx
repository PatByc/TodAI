/**
 * Card component for note list items.
 * Displays title, text excerpt, relative time, pin indicator, and tag badges.
 */

import { Link } from "@tanstack/react-router"
import { Pin } from "lucide-react"
import { formatRelativeTime, truncateText } from "@/lib/format"
import { TagBadge } from "./TagBadge"
import type { Note } from "@/types/entities"

interface NoteCardProps {
  note: Note
}

export function NoteCard({ note }: NoteCardProps) {
  const excerpt = truncateText(note.content_text, 80)
  const relativeTime = formatRelativeTime(note.updated_at)

  return (
    <Link
      to="/notes/$noteId"
      params={{ noteId: String(note.id) }}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div
        style={{
          padding: "12px 0",
          borderBottom: "1px solid var(--border-subtle)",
          cursor: "pointer",
          transition: "background-color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--bg-hover)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "4px",
          }}
        >
          {note.pinned && (
            <Pin
              size={12}
              style={{ color: "var(--primary)", flexShrink: 0 }}
            />
          )}
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              fontWeight: 400,
              color: "var(--foreground)",
              lineHeight: 1.5,
            }}
          >
            {note.title}
          </span>
        </div>

        {/* Excerpt */}
        {excerpt && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              color: "var(--text-3)",
              margin: "0 0 6px 0",
              lineHeight: 1.5,
            }}
          >
            {excerpt}
          </p>
        )}

        {/* Meta row: tags + time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
          }}
        >
          {note.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              color: "var(--text-3)",
              marginLeft: note.tags.length > 0 ? "2px" : "0",
            }}
          >
            {relativeTime}
          </span>
        </div>
      </div>
    </Link>
  )
}
