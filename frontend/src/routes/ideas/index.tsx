/**
 * Ideas list route at /ideas.
 * Displays IdeaCard list or EmptyState per UI-SPEC copywriting contract.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { useIdeas, useCreateIdea } from "@/hooks/useIdeas"
import { useFilterStore } from "@/stores/filters"
import { IdeaCard } from "@/components/entities/IdeaCard"
import { EmptyState } from "@/components/entities/EmptyState"

export const Route = createFileRoute("/ideas/")({
  component: IdeasPage,
})

function IdeasPage() {
  const navigate = useNavigate()
  const { selectedTagIds, tagLogic, includeArchived } = useFilterStore()

  const { data, isLoading } = useIdeas({
    include_archived: includeArchived || undefined,
    tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    tag_logic: selectedTagIds.length > 0 ? tagLogic : undefined,
  })

  const createIdea = useCreateIdea()

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
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
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

      {/* Content */}
      {isLoading ? (
        <div style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          Loading...
        </div>
      ) : ideas.length === 0 ? (
        <EmptyState
          heading="Waiting for inspiration"
          body="Jot down your next idea -- Tod will help you develop it."
        />
      ) : (
        <div>
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  )
}
