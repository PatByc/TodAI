/**
 * Idea detail route at /ideas/$ideaId.
 * Editable title, lifecycle pipeline, content textarea, and metadata.
 * Auto-saves: debounced 1.5s for text, immediate for state changes.
 * Converted state shows brief accent border flash.
 * Archived state dims the content area.
 */

import { createFileRoute } from "@tanstack/react-router"
import { useIdea, useUpdateIdea } from "@/hooks/useIdeas"
import { IdeaPipeline } from "@/components/entities/IdeaPipeline"
import { TagBadge } from "@/components/entities/TagBadge"
import { formatRelativeTime } from "@/lib/format"
import { useState, useCallback, useRef, useEffect } from "react"
import type { IdeaState } from "@/types/entities"

export const Route = createFileRoute("/ideas/$ideaId")({
  component: IdeaDetailPage,
})

function IdeaDetailPage() {
  const { ideaId } = Route.useParams()
  const id = Number(ideaId)
  const { data: idea, isLoading, error } = useIdea(id)
  const updateIdea = useUpdateIdea()

  // Local state for debounced text fields
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const initialized = useRef(false)
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Conversion celebration flash
  const [showCelebration, setShowCelebration] = useState(false)

  // Initialize local state from fetched idea
  useEffect(() => {
    if (idea && !initialized.current) {
      setTitle(idea.title)
      setContent(idea.content ?? "")
      initialized.current = true
    }
  }, [idea])

  // Reset initialization flag when navigating to a different idea
  useEffect(() => {
    initialized.current = false
  }, [id])

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current)
      if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current)
    }
  }, [])

  // Debounced title save (1.5s)
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle)
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current)
      titleDebounceRef.current = setTimeout(() => {
        if (newTitle.trim()) {
          updateIdea.mutate({ id, data: { title: newTitle.trim() } })
        }
        titleDebounceRef.current = null
      }, 1500)
    },
    [id, updateIdea],
  )

  // Debounced content save (1.5s)
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent)
      if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current)
      contentDebounceRef.current = setTimeout(() => {
        updateIdea.mutate({ id, data: { content: newContent } })
        contentDebounceRef.current = null
      }, 1500)
    },
    [id, updateIdea],
  )

  // Immediate state change save
  const handleStateChange = useCallback(
    (state: IdeaState) => {
      updateIdea.mutate({ id, data: { state } })

      // Show celebration flash when converted
      if (state === "converted") {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 1200)
      }
    },
    [id, updateIdea],
  )

  const isArchived = idea?.state === "archived"

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          padding: "28px 40px",
        }}
      >
        <div
          style={{
            height: "32px",
            width: "60%",
            backgroundColor: "var(--secondary)",
            borderRadius: "6px",
            marginBottom: "16px",
          }}
        />
        <div
          style={{
            height: "14px",
            width: "30%",
            backgroundColor: "var(--secondary)",
            borderRadius: "4px",
            marginBottom: "24px",
          }}
        />
        <div
          style={{
            height: "8px",
            backgroundColor: "var(--secondary)",
            borderRadius: "4px",
            marginBottom: "24px",
          }}
        />
        <div
          style={{
            height: "200px",
            backgroundColor: "var(--secondary)",
            borderRadius: "6px",
            opacity: 0.5,
          }}
        />
      </div>
    )
  }

  // Error state / not found
  if (error || !idea) {
    return (
      <div
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          padding: "28px 40px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--foreground)",
            marginBottom: "8px",
          }}
        >
          Idea not found
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            color: "var(--muted-foreground)",
          }}
        >
          This idea may have been deleted or doesn't exist.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        borderLeft: showCelebration ? "3px solid #4EBE5E" : "3px solid transparent",
        transition: "border-color 0.3s ease",
      }}
    >
      {/* Entity header */}
      <div
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          padding: "28px 40px 0",
        }}
      >
        {/* Editable title */}
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled Idea"
          style={{
            width: "100%",
            fontFamily: "var(--font-display)",
            fontSize: "26px",
            fontWeight: 700,
            lineHeight: 1.2,
            color: isArchived ? "var(--muted-foreground)" : "var(--foreground)",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: 0,
            margin: 0,
            transition: "color 0.2s ease",
          }}
        />

        {/* Meta line: tags + edited time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "8px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          {idea.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
          {idea.tags.length > 0 && (
            <span style={{ color: "var(--text-3)", fontSize: "12px" }}>
              ·
            </span>
          )}
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              color: "var(--text-3)",
              lineHeight: 1.5,
            }}
          >
            Edited {formatRelativeTime(idea.updated_at)}
          </span>
        </div>
      </div>

      {/* Pipeline and content */}
      <div
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          padding: "0 40px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Lifecycle pipeline */}
        <IdeaPipeline state={idea.state} onStateChange={handleStateChange} />

        {/* Content textarea */}
        <div>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--text-3)",
              lineHeight: 1.5,
              marginBottom: "6px",
              display: "block",
            }}
          >
            Content
          </span>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Describe your idea..."
            rows={8}
            style={{
              width: "100%",
              background: "var(--secondary)",
              color: isArchived ? "var(--muted-foreground)" : "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "12px",
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              lineHeight: 1.7,
              outline: "none",
              resize: "vertical",
              minHeight: "160px",
              opacity: isArchived ? 0.6 : 1,
              transition: "opacity 0.2s ease, color 0.2s ease",
            }}
          />
        </div>

        {/* Metadata footer */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            paddingTop: "16px",
            borderTop: "1px solid var(--border-subtle)",
            paddingBottom: "80px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              color: "var(--text-3)",
              lineHeight: 1.5,
            }}
          >
            Created {formatRelativeTime(idea.created_at)}
          </span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              color: "var(--text-3)",
              lineHeight: 1.5,
            }}
          >
            Updated {formatRelativeTime(idea.updated_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
