/**
 * Compact project assignment dropdown for entity detail views.
 * Allows assigning/unassigning an entity to a project (D-14).
 */

import { FolderOpen } from "lucide-react"
import { useProjects } from "@/hooks/useProjects"
import { SelectDropdown } from "@/components/ui/SelectDropdown"

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
      <SelectDropdown
        value={currentProjectId === null ? "" : String(currentProjectId)}
        options={[
          { value: "", label: "No project" },
          ...projects.map((project) => ({ value: String(project.id), label: project.name })),
        ]}
        onChange={(nextValue) => onProjectChange(nextValue ? Number(nextValue) : null)}
        ariaLabel="Project"
        size="compact"
        muted={currentProjectId === null}
        className="ui-select-project"
      />
    </div>
  )
}
