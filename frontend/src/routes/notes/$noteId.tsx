/**
 * Note detail route at /notes/$noteId.
 * Renders the Tiptap editor with auto-save per D-09.
 * Entity header with editable title, tag badges, and relative time meta.
 */

import { createFileRoute } from "@tanstack/react-router"
import { useNote, useUpdateNote } from "@/hooks/useNotes"
import { useAutoSave } from "@/hooks/useAutoSave"
import { TiptapEditor } from "@/components/editor/TiptapEditor"
import { TagBadge } from "@/components/entities/TagBadge"
import { formatRelativeTime } from "@/lib/format"
import { useState, useCallback, useRef, useEffect } from "react"

export const Route = createFileRoute("/notes/$noteId")({
  component: NoteDetailPage,
})

function NoteDetailPage() {
  const { noteId } = Route.useParams()
  const id = Number(noteId)
  const { data: note, isLoading, error } = useNote(id)
  const updateNote = useUpdateNote()
  const { debouncedSave } = useAutoSave(id)

  // Local title state for controlled input
  const [title, setTitle] = useState("")
  const titleInitialized = useRef(false)

  // Initialize title from fetched note
  useEffect(() => {
    if (note && !titleInitialized.current) {
      setTitle(note.title)
      titleInitialized.current = true
    }
  }, [note])

  // Reset initialization flag when navigating to a different note
  useEffect(() => {
    titleInitialized.current = false
  }, [id])

  const handleTitleBlur = useCallback(() => {
    if (note && title !== note.title && title.trim()) {
      updateNote.mutate({ id, data: { title: title.trim() } })
    }
  }, [id, note, title, updateNote])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur()
      }
    },
    [],
  )

  const handleEditorUpdate = useCallback(
    (content: Record<string, unknown>) => {
      debouncedSave(content)
    },
    [debouncedSave],
  )

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          padding: "28px 40px",
        }}
      >
        <div
          style={{
            height: "32px",
            width: "60%",
            backgroundColor: "var(--secondary)",
            borderRadius: "6px",
            marginBottom: "16px",
          }}
        />
        <div
          style={{
            height: "14px",
            width: "30%",
            backgroundColor: "var(--secondary)",
            borderRadius: "4px",
            marginBottom: "24px",
          }}
        />
        <div
          style={{
            height: "200px",
            backgroundColor: "var(--secondary)",
            borderRadius: "6px",
            opacity: 0.5,
          }}
        />
      </div>
    )
  }

  // Error state / not found
  if (error || !note) {
    return (
      <div
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          padding: "28px 40px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--foreground)",
            marginBottom: "8px",
          }}
        >
          Note not found
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            color: "var(--muted-foreground)",
          }}
        >
          This note may have been deleted or doesn't exist.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Entity header */}
      <div
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          padding: "28px 40px 0",
        }}
      >
        {/* Editable title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          placeholder="Untitled Note"
          style={{
            width: "100%",
            fontFamily: "var(--font-display)",
            fontSize: "26px",
            fontWeight: 700,
            lineHeight: 1.2,
            color: "var(--foreground)",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: 0,
            margin: 0,
          }}
        />

        {/* Meta line: tags + edited time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "8px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          {/* Tag badges */}
          {note.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}

          {/* Separator dot if tags exist */}
          {note.tags.length > 0 && (
            <span
              style={{
                color: "var(--text-3)",
                fontSize: "12px",
              }}
            >
              ·
            </span>
          )}

          {/* Edited relative time */}
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              color: "var(--text-3)",
              lineHeight: 1.5,
            }}
          >
            Edited {formatRelativeTime(note.updated_at)}
          </span>
        </div>
      </div>

      {/* Tiptap Editor */}
      <TiptapEditor
        initialContent={note.content || {}}
        onUpdate={handleEditorUpdate}
      />
    </div>
  )
}
