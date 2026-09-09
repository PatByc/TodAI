/**
 * Task status dropdown with colored status dots.
 * Shows all 5 statuses per D-12: Backlog, Todo, In Progress, Blocked, Done.
 * Dot colors per UI-SPEC Status Dot Colors.
 */

import type { TaskStatus } from "@/types/entities"

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
  const current = STATUS_OPTIONS.find((o) => o.value === value) ?? STATUS_OPTIONS[0]

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TaskStatus)}
        style={{
          appearance: "none",
          background: "var(--secondary)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "6px 32px 6px 28px",
          fontFamily: "var(--font-body)",
          fontSize: "14px",
          lineHeight: 1.5,
          cursor: "pointer",
          outline: "none",
          width: "100%",
        }}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {/* Status dot overlay on the left side of the select */}
      <span
        style={{
          position: "absolute",
          left: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          backgroundColor: current.color,
          pointerEvents: "none",
        }}
      />
      {/* Dropdown chevron on the right */}
      <span
        style={{
          position: "absolute",
          right: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "var(--muted-foreground)",
          fontSize: "10px",
        }}
      >
        &#9662;
      </span>
    </div>
  )
}
