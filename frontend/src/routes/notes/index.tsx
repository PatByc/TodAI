import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/notes/")({
  component: NotesPage,
})

function NotesPage() {
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
        Notes
      </h1>
      <p>No notes yet. Create your first note to start capturing ideas.</p>
    </div>
  )
}
