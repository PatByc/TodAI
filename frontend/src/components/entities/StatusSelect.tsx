/**
 * Task status dropdown with colored status dots.
 * Shows all 5 statuses per D-12: Backlog, Todo, In Progress, Blocked, Done.
 * Dot colors per UI-SPEC Status Dot Colors.
 */

import type { TaskStatus } from "@/types/entities"
import { SelectDropdown } from "@/components/ui/SelectDropdown"

interface StatusOption {
  value: TaskStatus
  label: string
  color: string
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: "backlog", label: "Backlog", color: "#5E7D69" },
  { value: "todo", label: "Todo", color: "#5EA8D4" },
  { value: "in_progress", label: "In Progress", color: "#D4A85E" },
  { value: "blocked", label: "Blocked", color: "#D46E7A" },
  { value: "done", label: "Done", color: "#4EBE5E" },
]

interface StatusSelectProps {
  value: TaskStatus
  onChange: (status: TaskStatus) => void
}

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  return (
    <SelectDropdown
      value={value}
      options={STATUS_OPTIONS}
      onChange={(nextValue) => onChange(nextValue as TaskStatus)}
      ariaLabel="Task status"
    />
  )
}
