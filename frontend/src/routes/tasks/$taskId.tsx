import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTask, useUpdateTask, useArchiveTask, useUnarchiveTask, useDeleteTask } from "@/hooks/useTasks"
import { StatusSelect } from "@/components/entities/StatusSelect"
import { PrioritySelect } from "@/components/entities/PrioritySelect"
import { TagInput } from "@/components/tags/TagInput"
import { formatRelativeTime } from "@/lib/format"
import { useState, useCallback, useRef, useEffect } from "react"
import { Archive, ArchiveRestore, Trash2 } from "lucide-react"
import type { TaskStatus } from "@/types/entities"

export const Route = createFileRoute("/tasks/$taskId")({
  component: TaskDetailPage,
})

function TaskDetailPage() {
  const { taskId } = Route.useParams()
  const navigate = useNavigate()
  const id = Number(taskId)
  const { data: task, isLoading, error } = useTask(id)
  const updateTask = useUpdateTask()
  const archiveTask = useArchiveTask()
  const unarchiveTask = useUnarchiveTask()
  const deleteTask = useDeleteTask()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const titleInitialized = useRef(false)
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (task && !titleInitialized.current) {
      setTitle(task.title)
      setDescription(task.description ?? "")
      titleInitialized.current = true
    }
  }, [task])

  useEffect(() => {
    titleInitialized.current = false
  }, [id])

  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current)
      if (descDebounceRef.current) clearTimeout(descDebounceRef.current)
    }
  }, [])

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle)
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current)
      titleDebounceRef.current = setTimeout(() => {
        if (newTitle.trim()) {
          updateTask.mutate({ id, data: { title: newTitle.trim() } })
        }
        titleDebounceRef.current = null
      }, 1500)
    },
    [id, updateTask],
  )

  const handleDescriptionChange = useCallback(
    (newDesc: string) => {
      setDescription(newDesc)
      if (descDebounceRef.current) clearTimeout(descDebounceRef.current)
      descDebounceRef.current = setTimeout(() => {
        updateTask.mutate({ id, data: { description: newDesc } })
        descDebounceRef.current = null
      }, 1500)
    },
    [id, updateTask],
  )

  const handleStatusChange = useCallback(
    (status: TaskStatus) => { updateTask.mutate({ id, data: { status } }) },
    [id, updateTask],
  )

  const handlePriorityChange = useCallback(
    (priority: number) => { updateTask.mutate({ id, data: { priority } }) },
    [id, updateTask],
  )

  const handleUrgencyChange = useCallback(
    (urgency: number) => { updateTask.mutate({ id, data: { urgency } }) },
    [id, updateTask],
  )

  const handleDeadlineChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      updateTask.mutate({ id, data: { deadline: value || undefined } })
    },
    [id, updateTask],
  )

  const handleArchiveToggle = useCallback(() => {
    if (task?.archived_at) {
      unarchiveTask.mutate(id)
    } else {
      archiveTask.mutate(id)
    }
  }, [id, task, archiveTask, unarchiveTask])

  const handleDelete = useCallback(() => {
    deleteTask.mutate(id, {
      onSuccess: () => { void navigate({ to: "/tasks" }) },
    })
  }, [id, deleteTask, navigate])

  if (isLoading) {
    return (
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "28px 40px" }}>
        <div style={{ height: "32px", width: "60%", backgroundColor: "var(--secondary)", borderRadius: "6px", marginBottom: "16px" }} />
        <div style={{ height: "14px", width: "30%", backgroundColor: "var(--secondary)", borderRadius: "4px", marginBottom: "24px" }} />
        <div style={{ height: "200px", backgroundColor: "var(--secondary)", borderRadius: "6px", opacity: 0.5 }} />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "28px 40px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 700, color: "var(--foreground)", marginBottom: "8px" }}>
          Task not found
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--muted-foreground)" }}>
          This task may have been deleted or doesn&apos;t exist.
        </p>
      </div>
    )
  }

  const deadlineValue = task.deadline ? task.deadline.slice(0, 10) : ""

  return (
    <div>
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "28px 40px 0" }}>
        {/* Header row: title + actions */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled Task"
            autoFocus={!task.title}
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
              title={task.archived_at ? "Unarchive" : "Archive"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "28px", height: "28px", borderRadius: "6px",
                border: "none", background: "transparent",
                color: "var(--muted-foreground)", cursor: "pointer",
              }}
            >
              {task.archived_at ? <ArchiveRestore size={16} /> : <Archive size={16} />}
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

        {/* Tags */}
        <div style={{ marginTop: "8px" }}>
          <TagInput entityType="task" entityId={id} />
        </div>

        {/* Meta line */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", marginBottom: "24px" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-3)", lineHeight: 1.5 }}>
            Edited {formatRelativeTime(task.updated_at)}
          </span>
          {task.archived_at && (
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

      {/* Task fields */}
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "0 40px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500, color: "var(--text-3)", lineHeight: 1.5, marginBottom: "6px", display: "block" }}>
            Status
          </span>
          <StatusSelect value={task.status} onChange={handleStatusChange} />
        </div>

        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
          <PrioritySelect value={task.priority} onChange={handlePriorityChange} label="Priority" />
          <PrioritySelect value={task.urgency} onChange={handleUrgencyChange} label="Urgency" />
        </div>

        <div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500, color: "var(--text-3)", lineHeight: 1.5, marginBottom: "6px", display: "block" }}>
            Deadline
          </span>
          <input
            type="date"
            value={deadlineValue}
            onChange={handleDeadlineChange}
            style={{
              appearance: "none", background: "var(--secondary)", color: deadlineValue ? "var(--foreground)" : "var(--muted-foreground)",
              border: "1px solid var(--border)", borderRadius: "6px", padding: "6px 12px",
              fontFamily: "var(--font-body)", fontSize: "14px", lineHeight: 1.5,
              cursor: "pointer", outline: "none", colorScheme: "dark",
            }}
          />
        </div>

        <div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500, color: "var(--text-3)", lineHeight: 1.5, marginBottom: "6px", display: "block" }}>
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Add a description..."
            rows={6}
            style={{
              width: "100%", background: "var(--secondary)", color: "var(--foreground)",
              border: "1px solid var(--border)", borderRadius: "6px", padding: "12px",
              fontFamily: "var(--font-body)", fontSize: "15px", lineHeight: 1.7,
              outline: "none", resize: "vertical", minHeight: "120px",
            }}
          />
        </div>

        {/* Metadata footer */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)", paddingBottom: "80px" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-3)", lineHeight: 1.5 }}>
            Created {formatRelativeTime(task.created_at)}
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-3)", lineHeight: 1.5 }}>
            Updated {formatRelativeTime(task.updated_at)}
          </span>
          {task.status === "done" && task.completed_at && (
            <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#4EBE5E", lineHeight: 1.5 }}>
              Completed {formatRelativeTime(task.completed_at)}
            </span>
          )}
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
              Delete Task
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
