import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useNotes, useCreateNote } from "@/hooks/useNotes"
import { useFetchAllTags } from "@/hooks/useTags"
import { useFilterStore } from "@/stores/filters"
import { NoteCard } from "@/components/entities/NoteCard"
import { EmptyState } from "@/components/entities/EmptyState"
import { EntityFilterBar } from "@/components/filters/EntityFilterBar"
import { DEFAULT_NOTE_DISPLAY_FIELDS, NoteDisplayOptions } from "@/components/notes/NoteDisplayOptions"
import type { NoteDisplayField } from "@/components/notes/NoteDisplayOptions"
import { useStoredFilterValue } from "@/hooks/useStoredFilterValue"

export const Route = createFileRoute("/notes/")({
  component: NotesPage,
})

const DISPLAY_STORAGE_KEY = "todai.notes.display-fields"
type NoteView = "all" | "pinned"
const isNoteView = (value: unknown): value is NoteView => value === "all" || value === "pinned"
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean"

function readDisplayFields(): NoteDisplayField[] {
  if (typeof window === "undefined") return DEFAULT_NOTE_DISPLAY_FIELDS
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(DISPLAY_STORAGE_KEY) ?? "null")
    if (!Array.isArray(stored)) return DEFAULT_NOTE_DISPLAY_FIELDS
    const validFields = new Set<NoteDisplayField>(DEFAULT_NOTE_DISPLAY_FIELDS)
    return [...new Set(stored.filter((field): field is NoteDisplayField => (
      typeof field === "string" && validFields.has(field as NoteDisplayField)
    )))]
  } catch {
    return DEFAULT_NOTE_DISPLAY_FIELDS
  }
}

function NotesPage() {
  const navigate = useNavigate()
  const [noteView, setNoteView] = useStoredFilterValue<NoteView>("todai.notes.filter-view", "all", isNoteView)
  const [includeArchived, setIncludeArchived] = useStoredFilterValue("todai.notes.filter-archived", false, isBoolean)
  const [displayFields, setDisplayFields] = useState<NoteDisplayField[]>(readDisplayFields)
  const { selectedTagIds, tagLogic, selectedProjectId } = useFilterStore((state) => state.byScope.notes)
  const { data: allTags = [] } = useFetchAllTags()

  const { data, isLoading } = useNotes({
    include_archived: includeArchived || undefined,
    tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    tag_logic: selectedTagIds.length > 0 ? tagLogic : undefined,
    project_id: selectedProjectId ?? undefined,
  })

  const createNote = useCreateNote()

  const updateDisplayFields = (fields: NoteDisplayField[]) => {
    setDisplayFields(fields)
    window.localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(fields))
  }

  const handleNewNote = () => {
    createNote.mutate(
      {
        title: "Untitled Note",
        content: { type: "doc", content: [{ type: "paragraph" }] },
      },
      {
        onSuccess: (note) => {
          void navigate({ to: "/notes/$noteId", params: { noteId: String(note.id) } })
        },
      },
    )
  }

  const notes = data?.items ?? []
  const visibleNotes = noteView === "pinned" ? notes.filter((note) => note.pinned) : notes

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

      <EntityFilterBar
        scope="notes"
        allTags={allTags}
        view={noteView}
        defaultView="all"
        viewOptions={[
          { value: "all", label: "All notes" },
          { value: "pinned", label: "Pinned" },
        ]}
        viewLabel="Note view"
        onViewChange={(view) => setNoteView(view as NoteView)}
        includeArchived={includeArchived}
        onIncludeArchivedChange={setIncludeArchived}
        extraControls={<NoteDisplayOptions fields={displayFields} onChange={updateDisplayFields} />}
      />

      {/* Content */}
      {isLoading ? (
        <div style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          Loading...
        </div>
      ) : visibleNotes.length === 0 ? (
        <EmptyState
          heading={noteView === "pinned" ? "No pinned notes" : "No notes yet"}
          body={noteView === "pinned" ? "Pin a note to keep it easy to find." : "Create your first note to start capturing ideas."}
        />
      ) : (
        <div>
          {visibleNotes.map((note) => (
            <NoteCard key={note.id} note={note} displayFields={displayFields} />
          ))}
        </div>
      )}
    </div>
  )
}
