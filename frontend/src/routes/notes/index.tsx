import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { useNotes, useCreateNote } from "@/hooks/useNotes"
import { useFetchAllTags } from "@/hooks/useTags"
import { useFilterStore } from "@/stores/filters"
import { NoteCard } from "@/components/entities/NoteCard"
import { EmptyState } from "@/components/entities/EmptyState"
import { TagFilterBar } from "@/components/tags/TagFilterBar"

export const Route = createFileRoute("/notes/")({
  component: NotesPage,
})

function NotesPage() {
  const navigate = useNavigate()
  const { selectedTagIds, tagLogic, includeArchived } = useFilterStore()
  const { data: allTags = [] } = useFetchAllTags()

  const { data, isLoading } = useNotes({
    include_archived: includeArchived || undefined,
    tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    tag_logic: selectedTagIds.length > 0 ? tagLogic : undefined,
  })

  const createNote = useCreateNote()

  const handleNewNote = () => {
    createNote.mutate(
      { title: "Untitled Note", content: {} },
      {
        onSuccess: (note) => {
          void navigate({ to: "/notes/$noteId", params: { noteId: String(note.id) } })
        },
      },
    )
  }

  const notes = data?.items ?? []

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "26px",
            fontWeight: 700,
            lineHeight: 1.2,
            color: "var(--foreground)",
            margin: 0,
          }}
        >
          Notes
        </h1>

        <button
          onClick={handleNewNote}
          disabled={createNote.isPending}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            fontWeight: 500,
            cursor: createNote.isPending ? "wait" : "pointer",
            opacity: createNote.isPending ? 0.7 : 1,
          }}
        >
          <Plus size={14} />
          New Note
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ marginBottom: "16px" }}>
        <TagFilterBar allTags={allTags} />
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          Loading...
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          heading="No notes yet"
          body="Create your first note to start capturing ideas."
        />
      ) : (
        <div>
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  )
}
