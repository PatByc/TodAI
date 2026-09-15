import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useIdea, useUpdateIdea, useArchiveIdea, useUnarchiveIdea, useDeleteIdea } from "@/hooks/useIdeas"
import { IdeaPipeline } from "@/components/entities/IdeaPipeline"
import { TagInput } from "@/components/tags/TagInput"
import { ProjectDropdown } from "@/components/entities/ProjectDropdown"
import { ConvertDropdown } from "@/components/conversion/ConvertDropdown"
import { formatRelativeTime } from "@/lib/format"
import { useState, useCallback, useRef, useEffect } from "react"
import { Archive, ArchiveRestore, Trash2 } from "lucide-react"
import type { IdeaState } from "@/types/entities"

export const Route = createFileRoute("/ideas/$ideaId")({
  component: IdeaDetailPage,
})

function IdeaDetailPage() {
  const { ideaId } = Route.useParams()
  const navigate = useNavigate()
  const id = Number(ideaId)
  const { data: idea, isLoading, error } = useIdea(id)
  const updateIdea = useUpdateIdea()
  const archiveIdea = useArchiveIdea()
  const unarchiveIdea = useUnarchiveIdea()
  const deleteIdea = useDeleteIdea()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const initialized = useRef(false)
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (idea && !initialized.current) {
      setTitle(idea.title)
      setContent(idea.content ?? "")
      initialized.current = true
    }
  }, [idea])

  useEffect(() => {
    initialized.current = false
  }, [id])

  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current)
      if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current)
    }
  }, [])

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

  const handleProjectChange = useCallback(
    (projectId: number | null) => {
      updateIdea.mutate({ id, data: { project_id: projectId } })
    },
    [id, updateIdea],
  )

  const handleConverted = useCallback(() => {
    void navigate({ to: "/ideas" })
  }, [navigate])

  const handleStateChange = useCallback(
    (state: IdeaState) => {
      updateIdea.mutate({ id, data: { state } })
      if (state === "converted") {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 1200)
      }
    },
    [id, updateIdea],
  )

  const handleArchiveToggle = useCallback(() => {
    if (idea?.archived_at) {
      unarchiveIdea.mutate(id)
    } else {
      archiveIdea.mutate(id)
    }
  }, [id, idea, archiveIdea, unarchiveIdea])

  const handleDelete = useCallback(() => {
    deleteIdea.mutate(id, {
      onSuccess: () => { void navigate({ to: "/ideas" }) },
    })
  }, [id, deleteIdea, navigate])

  const isArchived = idea?.state === "archived"

  if (isLoading) {
    return (
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "28px 40px" }}>
        <div style={{ height: "32px", width: "60%", backgroundColor: "var(--secondary)", borderRadius: "6px", marginBottom: "16px" }} />
        <div style={{ height: "14px", width: "30%", backgroundColor: "var(--secondary)", borderRadius: "4px", marginBottom: "24px" }} />
        <div style={{ height: "8px", backgroundColor: "var(--secondary)", borderRadius: "4px", marginBottom: "24px" }} />
        <div style={{ height: "200px", backgroundColor: "var(--secondary)", borderRadius: "6px", opacity: 0.5 }} />
      </div>
    )
  }

  if (error || !idea) {
    return (
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "28px 40px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 700, color: "var(--foreground)", marginBottom: "8px" }}>
          Idea not found
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--muted-foreground)" }}>
          This idea may have been deleted or doesn&apos;t exist.
        </p>
      </div>
    )
  }

  return (
    <div style={{ borderLeft: showCelebration ? "3px solid #4EBE5E" : "3px solid transparent", transition: "border-color 0.3s ease" }}>
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "28px 40px 0" }}>
        {/* Header row: title + actions */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled Idea"
            style={{
              flex: 1,
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

          <div style={{ display: "flex", gap: "4px", flexShrink: 0, paddingTop: "4px", alignItems: "center" }}>
            <ConvertDropdown
              sourceType="idea"
              sourceId={id}
              onConverted={handleConverted}
            />
            <button
              onClick={handleArchiveToggle}
              title={idea.archived_at ? "Unarchive" : "Archive"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "28px", height: "28px", borderRadius: "6px",
                border: "none", background: "transparent",
                color: "var(--muted-foreground)", cursor: "pointer",
              }}
            >
              {idea.archived_at ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "28px", height: "28px", borderRadius: "6px",
                border: "none", background: "transparent",
                color: "var(--destructive)", cursor: "pointer",
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Tags + Project */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px", flexWrap: "wrap" }}>
          <TagInput entityType="idea" entityId={id} />
          <ProjectDropdown
            entityType="idea"
            entityId={id}
            currentProjectId={idea.project_id}
            onProjectChange={handleProjectChange}
          />
        </div>

        {/* Meta line */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", marginBottom: "24px" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-3)", lineHeight: 1.5 }}>
            Edited {formatRelativeTime(idea.updated_at)}
          </span>
          {idea.archived_at && (
            <span style={{
              fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500,
              color: "var(--muted-foreground)", padding: "1px 6px",
              borderRadius: "4px", backgroundColor: "var(--secondary)",
            }}>
              Archived
            </span>
          )}
        </div>
      </div>

      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "0 40px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <IdeaPipeline state={idea.state} onStateChange={handleStateChange} />

        <div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500, color: "var(--text-3)", lineHeight: 1.5, marginBottom: "6px", display: "block" }}>
            Content
          </span>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Describe your idea..."
            rows={8}
            style={{
              width: "100%", background: "var(--secondary)",
              color: isArchived ? "var(--muted-foreground)" : "var(--foreground)",
              border: "1px solid var(--border)", borderRadius: "6px", padding: "12px",
              fontFamily: "var(--font-body)", fontSize: "15px", lineHeight: 1.7,
              outline: "none", resize: "vertical", minHeight: "160px",
              opacity: isArchived ? 0.6 : 1, transition: "opacity 0.2s ease, color 0.2s ease",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)", paddingBottom: "80px" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-3)", lineHeight: 1.5 }}>
            Created {formatRelativeTime(idea.created_at)}
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-3)", lineHeight: 1.5 }}>
            Updated {formatRelativeTime(idea.updated_at)}
          </span>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "24px", maxWidth: "400px", width: "90%" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "var(--foreground)", margin: "0 0 8px" }}>
              Delete Idea
            </h3>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--muted-foreground)", margin: "0 0 20px" }}>
              This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: "13px", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleDelete} style={{ padding: "6px 14px", borderRadius: "6px", border: "none", background: "var(--destructive)", color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
