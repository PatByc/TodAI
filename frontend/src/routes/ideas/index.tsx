import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useIdeas, useCreateIdea } from "@/hooks/useIdeas"
import { useFetchAllTags } from "@/hooks/useTags"
import { useFilterStore } from "@/stores/filters"
import { IdeaCard } from "@/components/entities/IdeaCard"
import { EmptyState } from "@/components/entities/EmptyState"
import { EntityFilterBar } from "@/components/filters/EntityFilterBar"
import { DEFAULT_IDEA_DISPLAY_FIELDS, IdeaDisplayOptions } from "@/components/ideas/IdeaDisplayOptions"
import type { IdeaDisplayField } from "@/components/ideas/IdeaDisplayOptions"
import type { IdeaState } from "@/types/entities"
import { useStoredFilterValue } from "@/hooks/useStoredFilterValue"

export const Route = createFileRoute("/ideas/")({
  component: IdeasPage,
})

const DISPLAY_STORAGE_KEY = "todai.ideas.display-fields"
type IdeaView = "all" | IdeaState
const isIdeaView = (value: unknown): value is IdeaView => (
  value === "all" || value === "raw" || value === "developing" || value === "converted"
)
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean"

function readDisplayFields(): IdeaDisplayField[] {
  if (typeof window === "undefined") return DEFAULT_IDEA_DISPLAY_FIELDS
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(DISPLAY_STORAGE_KEY) ?? "null")
    if (!Array.isArray(stored)) return DEFAULT_IDEA_DISPLAY_FIELDS
    const validFields = new Set<IdeaDisplayField>(DEFAULT_IDEA_DISPLAY_FIELDS)
    return [...new Set(stored.filter((field): field is IdeaDisplayField => (
      typeof field === "string" && validFields.has(field as IdeaDisplayField)
    )))]
  } catch {
    return DEFAULT_IDEA_DISPLAY_FIELDS
  }
}

function IdeasPage() {
  const navigate = useNavigate()
  const [ideaView, setIdeaView] = useStoredFilterValue<IdeaView>("todai.ideas.filter-view", "all", isIdeaView)
  const [includeArchived, setIncludeArchived] = useStoredFilterValue("todai.ideas.filter-archived", false, isBoolean)
  const [displayFields, setDisplayFields] = useState<IdeaDisplayField[]>(readDisplayFields)
  const { selectedTagIds, tagLogic, selectedProjectId } = useFilterStore((state) => state.byScope.ideas)
  const { data: allTags = [] } = useFetchAllTags()

  const { data, isLoading } = useIdeas({
    include_archived: includeArchived || undefined,
    tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    tag_logic: selectedTagIds.length > 0 ? tagLogic : undefined,
    project_id: selectedProjectId ?? undefined,
    state: ideaView === "all" ? undefined : ideaView,
  })

  const createIdea = useCreateIdea()

  const updateDisplayFields = (fields: IdeaDisplayField[]) => {
    setDisplayFields(fields)
    window.localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(fields))
  }

  const handleNewIdea = () => {
    createIdea.mutate(
      { title: "Untitled Idea", state: "raw" },
      {
        onSuccess: (idea) => {
          void navigate({ to: "/ideas/$ideaId", params: { ideaId: String(idea.id) } })
        },
      },
    )
  }

  const ideas = data?.items ?? []

  return (
    <div>
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
          Ideas
        </h1>

        <button
          onClick={handleNewIdea}
          disabled={createIdea.isPending}
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
            cursor: createIdea.isPending ? "wait" : "pointer",
            opacity: createIdea.isPending ? 0.7 : 1,
          }}
        >
          <Plus size={14} />
          New Idea
        </button>
      </div>

      <EntityFilterBar
        scope="ideas"
        allTags={allTags}
        view={ideaView}
        defaultView="all"
        viewOptions={[
          { value: "all", label: "All ideas" },
          { value: "raw", label: "Raw" },
          { value: "developing", label: "Developing" },
          { value: "converted", label: "Converted" },
        ]}
        viewLabel="Idea state"
        onViewChange={(view) => setIdeaView(view as IdeaView)}
        includeArchived={includeArchived}
        onIncludeArchivedChange={setIncludeArchived}
        extraControls={<IdeaDisplayOptions fields={displayFields} onChange={updateDisplayFields} />}
      />

      {isLoading ? (
        <div style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          Loading...
        </div>
      ) : ideas.length === 0 ? (
        <EmptyState
          heading={ideaView === "all" ? "Waiting for inspiration" : "No matching ideas"}
          body={ideaView === "all" ? "Jot down your next idea -- Tod will help you develop it." : "Choose another state or clear the filters."}
        />
      ) : (
        <div>
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} displayFields={displayFields} />
          ))}
        </div>
      )}
    </div>
  )
}
