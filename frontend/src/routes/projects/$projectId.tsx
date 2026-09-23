import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useProject, useUpdateProject, useArchiveProject, useUnarchiveProject, useDeleteProject } from "@/hooks/useProjects"
import { useNotes, useCreateNote } from "@/hooks/useNotes"
import { useTasks, useCreateTask } from "@/hooks/useTasks"
import { useIdeas, useCreateIdea } from "@/hooks/useIdeas"
import { TiptapEditor } from "@/components/editor/TiptapEditor"
import { TagInput } from "@/components/tags/TagInput"
import { formatRelativeTime } from "@/lib/format"
import { useState, useCallback, useRef, useEffect } from "react"
import { Archive, ArchiveRestore, Trash2, Plus, FileText, CheckSquare, Lightbulb } from "lucide-react"
import { Link } from "@tanstack/react-router"
import type { ProjectStatus } from "@/types/entities"

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailPage,
})

// ── Project status config ─────────────────────────────────────────────

interface ProjectStatusOption {
  value: ProjectStatus
  label: string
  color: string
}

const PROJECT_STATUS_OPTIONS: ProjectStatusOption[] = [
  { value: "active", label: "Active", color: "#4EBE5E" },
  { value: "on_hold", label: "On Hold", color: "#D4A85E" },
  { value: "completed", label: "Completed", color: "#5EA8D4" },
  { value: "archived", label: "Archived", color: "#5E7D69" },
]

// ── Tiptap plain text extraction ──────────────────────────────────────

function extractPlainText(node: Record<string, unknown>): string {
  const parts: string[] = []
  if (node.text && typeof node.text === "string") {
    parts.push(node.text)
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      if (child && typeof child === "object") {
        parts.push(extractPlainText(child as Record<string, unknown>))
      }
    }
  }
  const nodeType = node.type as string | undefined
  if (
    nodeType === "paragraph" ||
    nodeType === "heading" ||
    nodeType === "codeBlock" ||
    nodeType === "blockquote" ||
    nodeType === "listItem" ||
    nodeType === "taskItem"
  ) {
    parts.push("\n")
  }
  return parts.join("")
}

// ── Component ─────────────────────────────────────────────────────────

function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  const navigate = useNavigate()
  const id = Number(projectId)
  const { data: project, isLoading, error } = useProject(id)
  const updateProject = useUpdateProject()
  const archiveProject = useArchiveProject()
  const unarchiveProject = useUnarchiveProject()
  const deleteProject = useDeleteProject()

  // Linked entities
  const { data: notesData } = useNotes({ project_id: id })
  const { data: tasksData } = useTasks({ project_id: id })
  const { data: ideasData } = useIdeas({ project_id: id })

  const createNote = useCreateNote()
  const createTask = useCreateTask()
  const createIdea = useCreateIdea()

  // Local state
  const [name, setName] = useState("")
  const [goals, setGoals] = useState("")
  const [currentFocus, setCurrentFocus] = useState("")
  const initialized = useRef(false)
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const goalsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (project && !initialized.current) {
      setName(project.name)
      setGoals(project.goals ?? "")
      setCurrentFocus(project.current_focus ?? "")
      initialized.current = true
    }
  }, [project])

  useEffect(() => {
    initialized.current = false
  }, [id])

  useEffect(() => {
    return () => {
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current)
      if (goalsDebounceRef.current) clearTimeout(goalsDebounceRef.current)
      if (focusDebounceRef.current) clearTimeout(focusDebounceRef.current)
      if (descDebounceRef.current) clearTimeout(descDebounceRef.current)
    }
  }, [])

  // ── Auto-save handlers ────────────────────────────────────────────

  const handleNameChange = useCallback(
    (newName: string) => {
      setName(newName)
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current)
      nameDebounceRef.current = setTimeout(() => {
        if (newName.trim()) {
          updateProject.mutate({ id, data: { name: newName.trim() } })
        }
        nameDebounceRef.current = null
      }, 1500)
    },
    [id, updateProject],
  )

  const handleGoalsChange = useCallback(
    (newGoals: string) => {
      setGoals(newGoals)
      if (goalsDebounceRef.current) clearTimeout(goalsDebounceRef.current)
      goalsDebounceRef.current = setTimeout(() => {
        updateProject.mutate({ id, data: { goals: newGoals } })
        goalsDebounceRef.current = null
      }, 1500)
    },
    [id, updateProject],
  )

  const handleFocusChange = useCallback(
    (newFocus: string) => {
      setCurrentFocus(newFocus)
      if (focusDebounceRef.current) clearTimeout(focusDebounceRef.current)
      focusDebounceRef.current = setTimeout(() => {
        updateProject.mutate({ id, data: { current_focus: newFocus } })
        focusDebounceRef.current = null
      }, 1500)
    },
    [id, updateProject],
  )

  const handleDescriptionUpdate = useCallback(
    (content: Record<string, unknown>) => {
      if (descDebounceRef.current) clearTimeout(descDebounceRef.current)
      descDebounceRef.current = setTimeout(() => {
        const descriptionText = extractPlainText(content).trim()
        updateProject.mutate({ id, data: { description: content, description_text: descriptionText } })
        descDebounceRef.current = null
      }, 1500)
    },
    [id, updateProject],
  )

  const handleStatusChange = useCallback(
    (status: ProjectStatus) => {
      updateProject.mutate({ id, data: { status } })
    },
    [id, updateProject],
  )

  const handleArchiveToggle = useCallback(() => {
    if (project?.archived_at) {
      unarchiveProject.mutate(id)
    } else {
      archiveProject.mutate(id)
    }
  }, [id, project, archiveProject, unarchiveProject])

  const handleDelete = useCallback(() => {
    deleteProject.mutate(id, {
      onSuccess: () => {
        void navigate({ to: "/projects" })
      },
    })
  }, [id, deleteProject, navigate])

  // ── Create linked entities (D-15: auto-assign project_id) ─────────

  const handleAddNote = useCallback(() => {
    createNote.mutate(
      {
        title: "Untitled Note",
        content: { type: "doc", content: [{ type: "paragraph" }] },
        project_id: id,
      },
      {
        onSuccess: (note) => {
          void navigate({ to: "/notes/$noteId", params: { noteId: String(note.id) } })
        },
      },
    )
  }, [id, createNote, navigate])

  const handleAddTask = useCallback(() => {
    createTask.mutate(
      { title: "Untitled Task", project_id: id },
      {
        onSuccess: (task) => {
          void navigate({ to: "/tasks/$taskId", params: { taskId: String(task.id) } })
        },
      },
    )
  }, [id, createTask, navigate])

  const handleAddIdea = useCallback(() => {
    createIdea.mutate(
      { title: "Untitled Idea", project_id: id },
      {
        onSuccess: (idea) => {
          void navigate({ to: "/ideas/$ideaId", params: { ideaId: String(idea.id) } })
        },
      },
    )
  }, [id, createIdea, navigate])

  // ── Loading / error states ────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "28px 40px" }}>
        <div style={{ height: "32px", width: "60%", backgroundColor: "var(--secondary)", borderRadius: "6px", marginBottom: "16px" }} />
        <div style={{ height: "14px", width: "30%", backgroundColor: "var(--secondary)", borderRadius: "4px", marginBottom: "24px" }} />
        <div style={{ height: "200px", backgroundColor: "var(--secondary)", borderRadius: "6px", opacity: 0.5 }} />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "28px 40px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 700, color: "var(--foreground)", marginBottom: "8px" }}>
          Project not found
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--muted-foreground)" }}>
          This project may have been deleted or doesn&apos;t exist.
        </p>
      </div>
    )
  }

  const linkedNotes = notesData?.items ?? []
  const linkedTasks = tasksData?.items ?? []
  const linkedIdeas = ideasData?.items ?? []

  const currentStatus = PROJECT_STATUS_OPTIONS.find((o) => o.value === project.status) ?? PROJECT_STATUS_OPTIONS[0]

  return (
    <div>
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "28px 40px 0" }}>
        {/* Header row: name + actions */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Untitled Project"
            style={{
              flex: 1,
              fontFamily: "var(--font-display)",
              fontSize: "26px",
              fontWeight: 700,
              lineHeight: 1.2,
              color: "var(--foreground)",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: 0,
              margin: 0,
            }}
          />

          <div style={{ display: "flex", gap: "4px", flexShrink: 0, paddingTop: "4px" }}>
            <button
              onClick={handleArchiveToggle}
              title={project.archived_at ? "Unarchive" : "Archive"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "28px", height: "28px", borderRadius: "6px",
                border: "none", background: "transparent",
                color: "var(--muted-foreground)", cursor: "pointer",
              }}
            >
              {project.archived_at ? <ArchiveRestore size={16} /> : <Archive size={16} />}
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

        {/* Status dropdown */}
        <div style={{ marginTop: "12px" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
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
              }}
            >
              {PROJECT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: currentStatus.color,
                pointerEvents: "none",
              }}
            />
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
        </div>

        {/* Tags */}
        <div style={{ marginTop: "8px" }}>
          <TagInput entityType="project" entityId={id} />
        </div>

        {/* Meta line */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", marginBottom: "16px" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-3)", lineHeight: 1.5 }}>
            Edited {formatRelativeTime(project.updated_at)}
          </span>
          {project.archived_at && (
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

      {/* Project fields */}
      <div id="body" style={{ maxWidth: "840px", margin: "0 auto", padding: "0 40px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Current Focus (D-07: plain text one-liner) */}
        <div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500, color: "var(--text-3)", lineHeight: 1.5, marginBottom: "6px", display: "block" }}>
            Current Focus
          </span>
          <input
            type="text"
            value={currentFocus}
            onChange={(e) => handleFocusChange(e.target.value)}
            placeholder="What are you focused on?"
            style={{
              width: "100%",
              background: "var(--secondary)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "6px 12px",
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              lineHeight: 1.5,
              outline: "none",
            }}
          />
        </div>

        {/* Goals (D-07: plain text) */}
        <div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500, color: "var(--text-3)", lineHeight: 1.5, marginBottom: "6px", display: "block" }}>
            Goals
          </span>
          <textarea
            value={goals}
            onChange={(e) => handleGoalsChange(e.target.value)}
            placeholder="Project goals..."
            rows={4}
            style={{
              width: "100%",
              background: "var(--secondary)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "12px",
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              lineHeight: 1.7,
              outline: "none",
              resize: "vertical",
              minHeight: "80px",
            }}
          />
        </div>

        {/* Description (D-07: Tiptap rich text) */}
        <div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500, color: "var(--text-3)", lineHeight: 1.5, marginBottom: "6px", display: "block" }}>
            Description
          </span>
        </div>
      </div>

      <TiptapEditor
        initialContent={project.description || {}}
        onUpdate={handleDescriptionUpdate}
      />

      {/* Linked Entities (D-06: unified scrollable list grouped by type) */}
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "24px 40px 0" }}>
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "24px" }}>
          {/* Add entity buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>
              Linked Entities
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={handleAddNote}
              disabled={createNote.isPending}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                padding: "4px 10px", borderRadius: "6px",
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--muted-foreground)", cursor: "pointer",
                fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500,
              }}
            >
              <Plus size={12} /> Note
            </button>
            <button
              onClick={handleAddTask}
              disabled={createTask.isPending}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                padding: "4px 10px", borderRadius: "6px",
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--muted-foreground)", cursor: "pointer",
                fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500,
              }}
            >
              <Plus size={12} /> Task
            </button>
            <button
              onClick={handleAddIdea}
              disabled={createIdea.isPending}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                padding: "4px 10px", borderRadius: "6px",
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--muted-foreground)", cursor: "pointer",
                fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500,
              }}
            >
              <Plus size={12} /> Idea
            </button>
          </div>

          {/* Notes section */}
          <EntitySection
            title="Notes"
            count={linkedNotes.length}
            icon={<FileText size={14} style={{ color: "var(--muted-foreground)" }} />}
            emptyText="No notes linked"
          >
            {linkedNotes.map((note) => (
              <LinkedEntityRow
                key={note.id}
                to="/notes/$noteId"
                params={{ noteId: String(note.id) }}
                title={note.title}
                meta={formatRelativeTime(note.updated_at)}
              />
            ))}
          </EntitySection>

          {/* Tasks section */}
          <EntitySection
            title="Tasks"
            count={linkedTasks.length}
            icon={<CheckSquare size={14} style={{ color: "var(--muted-foreground)" }} />}
            emptyText="No tasks linked"
          >
            {linkedTasks.map((task) => (
              <LinkedEntityRow
                key={task.id}
                to="/tasks/$taskId"
                params={{ taskId: String(task.id) }}
                title={task.title}
                meta={formatRelativeTime(task.updated_at)}
                statusDot={task.status}
              />
            ))}
          </EntitySection>

          {/* Ideas section */}
          <EntitySection
            title="Ideas"
            count={linkedIdeas.length}
            icon={<Lightbulb size={14} style={{ color: "var(--muted-foreground)" }} />}
            emptyText="No ideas linked"
          >
            {linkedIdeas.map((idea) => (
              <LinkedEntityRow
                key={idea.id}
                to="/ideas/$ideaId"
                params={{ ideaId: String(idea.id) }}
                title={idea.title}
                meta={formatRelativeTime(idea.updated_at)}
              />
            ))}
          </EntitySection>
        </div>

        {/* Metadata footer */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)", paddingBottom: "80px", marginTop: "24px" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-3)", lineHeight: 1.5 }}>
            Created {formatRelativeTime(project.created_at)}
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-3)", lineHeight: 1.5 }}>
            Updated {formatRelativeTime(project.updated_at)}
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
              Delete Project
            </h3>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--muted-foreground)", margin: "0 0 20px" }}>
              This will delete the project. Linked entities will remain but lose their project association.
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

// ── Entity Section sub-component ──────────────────────────────────────

interface EntitySectionProps {
  title: string
  count: number
  icon: React.ReactNode
  emptyText: string
  children: React.ReactNode
}

function EntitySection({ title, count, icon, emptyText, children }: EntitySectionProps) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
        {icon}
        <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 500, color: "var(--text-3)" }}>
          {title} ({count})
        </span>
      </div>
      {count === 0 ? (
        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--muted-foreground)", margin: "0 0 0 20px", opacity: 0.7 }}>
          {emptyText}
        </p>
      ) : (
        <div>{children}</div>
      )}
    </div>
  )
}

// ── Linked Entity Row sub-component ───────────────────────────────────

const STATUS_DOT_COLORS: Record<string, string> = {
  backlog: "#5E7D69",
  todo: "#5EA8D4",
  in_progress: "#D4A85E",
  blocked: "#D46E7A",
  done: "#4EBE5E",
}

interface LinkedEntityRowProps {
  to: string
  params: Record<string, string>
  title: string
  meta: string
  statusDot?: string
}

function LinkedEntityRow({ to, params, title, meta, statusDot }: LinkedEntityRowProps) {
  return (
    <Link
      to={to}
      params={params}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 8px",
          borderRadius: "4px",
          cursor: "pointer",
          transition: "background-color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--bg-hover)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        {statusDot && (
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: STATUS_DOT_COLORS[statusDot] ?? "#5E7D69",
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            color: "var(--foreground)",
            lineHeight: 1.5,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "11px",
            color: "var(--text-3)",
            flexShrink: 0,
          }}
        >
          {meta}
        </span>
      </div>
    </Link>
  )
}
