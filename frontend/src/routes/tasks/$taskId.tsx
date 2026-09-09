/**
 * Task detail route stub.
 * Will be replaced with full task editor in Plan 06.
 */

import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/tasks/$taskId")({
  component: TaskDetailPage,
})

function TaskDetailPage() {
  const { taskId } = Route.useParams()

  return (
    <div style={{ color: "var(--muted-foreground)", fontSize: "15px" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "26px",
          fontWeight: 700,
          lineHeight: 1.2,
          color: "var(--foreground)",
          marginBottom: "16px",
        }}
      >
        Task #{taskId}
      </h1>
      <p>Task editor will be implemented in Plan 06.</p>
    </div>
  )
}
