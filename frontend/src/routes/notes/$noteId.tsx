/**
 * Note detail route stub.
 * Will be replaced with full Tiptap editor implementation in Plan 05.
 */

import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/notes/$noteId")({
  component: NoteDetailPage,
})

function NoteDetailPage() {
  const { noteId } = Route.useParams()

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
        Note #{noteId}
      </h1>
      <p>Editor will be implemented in Plan 05.</p>
    </div>
  )
}
