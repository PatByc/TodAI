import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useNote, useUpdateNote, useArchiveNote, useUnarchiveNote, useDeleteNote } from "@/hooks/useNotes"
import { useAutoSave } from "@/hooks/useAutoSave"
import { TiptapEditor } from "@/components/editor/TiptapEditor"
import { TagInput } from "@/components/tags/TagInput"
import { formatRelativeTime } from "@/lib/format"
import { useState, useCallback, useRef, useEffect } from "react"
import { Archive, ArchiveRestore, Trash2 } from "lucide-react"

export const Route = createFileRoute("/notes/$noteId")({
  component: NoteDetailPage,
})

function NoteDetailPage() {
  const { noteId } = Route.useParams()
  const navigate = useNavigate()
  const id = Number(noteId)
  const { data: note, isLoading, error } = useNote(id)
  const updateNote = useUpdateNote()
  const archiveNote = useArchiveNote()
  const unarchiveNote = useUnarchiveNote()
  const deleteNote = useDeleteNote()
  const { debouncedSave } = useAutoSave(id)

  const [title, setTitle] = useState("")
  const titleInitialized = useRef(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (note && !titleInitialized.current) {
      setTitle(note.title)
      titleInitialized.current = true
    }
  }, [note])

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

  const handleArchiveToggle = useCallback(() => {
    if (note?.archived_at) {
      unarchiveNote.mutate(id)
    } else {
      archiveNote.mutate(id)
    }
  }, [id, note, archiveNote, unarchiveNote])

  const handleDelete = useCallback(() => {
    deleteNote.mutate(id, {
      onSuccess: () => {
        void navigate({ to: "/notes" })
      },
    })
  }, [id, deleteNote, navigate])

  if (isLoading) {
    return (
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "28px 40px" }}>
        <div style={{ height: "32px", width: "60%", backgroundColor: "var(--secondary)", borderRadius: "6px", marginBottom: "16px" }} />
        <div style={{ height: "14px", width: "30%", backgroundColor: "var(--secondary)", borderRadius: "4px", marginBottom: "24px" }} />
        <div style={{ height: "200px", backgroundColor: "var(--secondary)", borderRadius: "6px", opacity: 0.5 }} />
      </div>
    )
  }

  if (error || !note) {
    return (
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "28px 40px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 700, color: "var(--foreground)", marginBottom: "8px" }}>
          Note not found
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--muted-foreground)" }}>
          This note may have been deleted or doesn&apos;t exist.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "28px 40px 0" }}>
        {/* Header row: title + actions */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled Note"
            style={{
              flex: 1,
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

          <div style={{ display: "flex", gap: "4px", flexShrink: 0, paddingTop: "4px" }}>
            <button
              onClick={handleArchiveToggle}
              title={note.archived_at ? "Unarchive" : "Archive"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "none",
                background: "transparent",
                color: "var(--muted-foreground)",
                cursor: "pointer",
              }}
            >
              {note.archived_at ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "none",
                background: "transparent",
                color: "var(--destructive)",
                cursor: "pointer",
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Tags */}
        <div style={{ marginTop: "8px" }}>
          <TagInput entityType="note" entityId={id} />
        </div>

        {/* Meta line */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", marginBottom: "16px" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-3)", lineHeight: 1.5 }}>
            Edited {formatRelativeTime(note.updated_at)}
          </span>
          {note.archived_at && (
            <span style={{
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--muted-foreground)",
              padding: "1px 6px",
              borderRadius: "4px",
              backgroundColor: "var(--secondary)",
            }}>
              Archived
            </span>
          )}
        </div>
      </div>

      <TiptapEditor
        initialContent={note.content || {}}
        onUpdate={handleEditorUpdate}
      />

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "400px",
              width: "90%",
            }}
          >
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "var(--foreground)", margin: "0 0 8px" }}>
              Delete Note
            </h3>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--muted-foreground)", margin: "0 0 20px" }}>
              This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--foreground)",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: "var(--destructive)",
                  color: "var(--foreground)",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
