/**
 * Compact project assignment dropdown for entity detail views.
 * Allows assigning/unassigning an entity to a project (D-14).
 */

import { FolderOpen } from "lucide-react"
import { useProjects } from "@/hooks/useProjects"

interface ProjectDropdownProps {
  entityType: "note" | "task" | "idea"
  entityId: number
  currentProjectId: number | null
  onProjectChange: (projectId: number | null) => void
}

export function ProjectDropdown({
  currentProjectId,
  onProjectChange,
}: ProjectDropdownProps) {
  const { data: projectsData } = useProjects({ include_archived: false })
  const projects = projectsData?.items ?? []

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <FolderOpen
        size={13}
        style={{ color: "var(--muted-foreground)", flexShrink: 0 }}
      />
      <select
        value={currentProjectId ?? ""}
        onChange={(e) => {
          const value = e.target.value
          onProjectChange(value ? Number(value) : null)
        }}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          padding: "2px 20px 2px 6px",
          fontFamily: "var(--font-body)",
          fontSize: "12px",
          color: currentProjectId ? "var(--foreground)" : "var(--muted-foreground)",
          cursor: "pointer",
          outline: "none",
          maxWidth: "180px",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 4px center",
          backgroundSize: "12px",
        }}
      >
        <option value="">No project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  )
}
