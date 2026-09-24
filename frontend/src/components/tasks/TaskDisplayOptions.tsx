import { Archive, CalendarDays, CircleDot, Clock3, Flag, Gauge, Tags } from "lucide-react"
import { EntityDisplayOptions } from "@/components/filters/EntityDisplayOptions"

export type TaskDisplayField = "tags" | "status" | "priority" | "urgency" | "deadline" | "archived" | "updated"

export const DEFAULT_TASK_DISPLAY_FIELDS: TaskDisplayField[] = [
  "tags",
  "status",
  "priority",
  "urgency",
  "deadline",
  "archived",
  "updated",
]

const FIELD_OPTIONS: Array<{
  value: TaskDisplayField
  label: string
  icon: typeof Tags
}> = [
  { value: "tags", label: "Tags", icon: Tags },
  { value: "status", label: "Status", icon: CircleDot },
  { value: "priority", label: "Priority", icon: Flag },
  { value: "urgency", label: "Urgency", icon: Gauge },
  { value: "deadline", label: "Deadline", icon: CalendarDays },
  { value: "archived", label: "Archived state", icon: Archive },
  { value: "updated", label: "Last updated", icon: Clock3 },
]

export function TaskDisplayOptions({
  fields,
  onChange,
}: {
  fields: TaskDisplayField[]
  onChange: (fields: TaskDisplayField[]) => void
}) {
  return (
    <EntityDisplayOptions
      fields={fields}
      options={FIELD_OPTIONS}
      entityLabel="tasks"
      defaultFields={DEFAULT_TASK_DISPLAY_FIELDS}
      onChange={onChange}
    />
  )
}
