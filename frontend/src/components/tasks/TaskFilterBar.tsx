import { EntityFilterBar } from "@/components/filters/EntityFilterBar"
import { TaskDisplayOptions } from "@/components/tasks/TaskDisplayOptions"
import type { TaskDisplayField } from "@/components/tasks/TaskDisplayOptions"
import type { TagResponse } from "@/types/entities"

export type TaskView = "all" | "active" | "today" | "completed"

export function TaskFilterBar({
  allTags,
  taskView,
  onTaskViewChange,
  includeArchived,
  onIncludeArchivedChange,
  displayFields,
  onDisplayFieldsChange,
}: {
  allTags: TagResponse[]
  taskView: TaskView
  onTaskViewChange: (view: TaskView) => void
  includeArchived: boolean
  onIncludeArchivedChange: (value: boolean) => void
  displayFields: TaskDisplayField[]
  onDisplayFieldsChange: (fields: TaskDisplayField[]) => void
}) {
  return (
    <EntityFilterBar
      scope="tasks"
      allTags={allTags}
      view={taskView}
      defaultView="all"
      viewOptions={[
        { value: "all", label: "All tasks" },
        { value: "today", label: "Today" },
        { value: "active", label: "Active" },
        { value: "completed", label: "Completed" },
      ]}
      viewLabel="Task view"
      onViewChange={(view) => onTaskViewChange(view as TaskView)}
      includeArchived={includeArchived}
      onIncludeArchivedChange={onIncludeArchivedChange}
      extraControls={<TaskDisplayOptions fields={displayFields} onChange={onDisplayFieldsChange} />}
    />
  )
}
