/**
 * Idea detail route stub.
 * Will be replaced with full idea editor in Plan 07.
 */

import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/ideas/$ideaId")({
  component: IdeaDetailPage,
})

function IdeaDetailPage() {
  const { ideaId } = Route.useParams()

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
        Idea #{ideaId}
      </h1>
      <p>Idea editor will be implemented in Plan 07.</p>
    </div>
  )
}
