import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/tasks/")({
  component: TasksPage,
})

function TasksPage() {
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
        Tasks
      </h1>
      <p>All clear. No tasks right now. Create one when something needs doing.</p>
    </div>
  )
}
