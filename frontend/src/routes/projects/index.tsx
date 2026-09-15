import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { useProjects, useCreateProject } from "@/hooks/useProjects"
import { useFetchAllTags } from "@/hooks/useTags"
import { useFilterStore } from "@/stores/filters"
import { ProjectCard } from "@/components/entities/ProjectCard"
import { EmptyState } from "@/components/entities/EmptyState"
import { TagFilterBar } from "@/components/tags/TagFilterBar"

export const Route = createFileRoute("/projects/")({
  component: ProjectsPage,
})

function ProjectsPage() {
  const navigate = useNavigate()
  const { selectedTagIds, tagLogic, includeArchived } = useFilterStore()
  const { data: allTags = [] } = useFetchAllTags()

  const { data, isLoading } = useProjects({
    include_archived: includeArchived || undefined,
    tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    tag_logic: selectedTagIds.length > 0 ? tagLogic : undefined,
  })

  const createProject = useCreateProject()

  const handleNewProject = () => {
    createProject.mutate(
      { name: "Untitled Project" },
      {
        onSuccess: (project) => {
          void navigate({ to: "/projects/$projectId", params: { projectId: String(project.id) } })
        },
      },
    )
  }

  const projects = data?.items ?? []

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
          Projects
        </h1>

        <button
          onClick={handleNewProject}
          disabled={createProject.isPending}
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
            cursor: createProject.isPending ? "wait" : "pointer",
            opacity: createProject.isPending ? 0.7 : 1,
          }}
        >
          <Plus size={14} />
          New Project
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
      ) : projects.length === 0 ? (
        <EmptyState
          heading="No projects yet"
          body="Create a project to organize your notes, tasks, and ideas."
        />
      ) : (
        <div>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
