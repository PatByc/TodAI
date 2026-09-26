import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTask, useUpdateTask, useArchiveTask, useUnarchiveTask, useDeleteTask } from "@/hooks/useTasks"
import { StatusSelect } from "@/components/entities/StatusSelect"
import { PrioritySelect } from "@/components/entities/PrioritySelect"
import { TagInput } from "@/components/tags/TagInput"
import { ProjectDropdown } from "@/components/entities/ProjectDropdown"
import { DatePicker } from "@/components/ui/DatePicker"
import { SelectDropdown } from "@/components/ui/SelectDropdown"
import { TaskStateHistory } from "@/components/tasks/TaskStateHistory"
import { formatRelativeTime } from "@/lib/format"
import { deriveEntryTitle, shouldAutoName } from "@/lib/entryNaming"
import { useState, useCallback, useRef, useEffect } from "react"
import { Archive, ArchiveRestore, ArrowLeft, Repeat2, Trash2 } from "lucide-react"
import type { Task, TaskRecurrence, TaskStatus, TaskUpdate } from "@/types/entities"

export const Route = createFileRoute("/tasks/$taskId")({
  component: TaskDetailPage,
})

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Never", icon: <Repeat2 size={13} /> },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom…" },
]

const UNIT_OPTIONS = [
  { value: "daily", label: "days" },
  { value: "weekly", label: "weeks" },
  { value: "monthly", label: "months" },
  { value: "yearly", label: "years" },
]

function TaskRecurrenceControl({ task, onChange }: { task: Task; onChange: (data: TaskUpdate) => void }) {
  const hasAdvancedRule = task.recurrence_interval > 1 || Boolean(task.recurrence_end_date) || Boolean(task.recurrence_limit)
  const [customOpen, setCustomOpen] = useState(hasAdvancedRule)
  const [endMode, setEndMode] = useState<"never" | "date" | "count">(
    task.recurrence_end_date ? "date" : task.recurrence_limit ? "count" : "never",
  )
  const [interval, setInterval] = useState(String(task.recurrence_interval || 1))
  const [limit, setLimit] = useState(String(task.recurrence_limit ?? 2))

  useEffect(() => {
    setCustomOpen(task.recurrence_interval > 1 || Boolean(task.recurrence_end_date) || Boolean(task.recurrence_limit))
    setEndMode(task.recurrence_end_date ? "date" : task.recurrence_limit ? "count" : "never")
    setInterval(String(task.recurrence_interval || 1))
    setLimit(String(task.recurrence_limit ?? 2))
  }, [task.id])

  if (!task.deadline) {
    return (
      <div className="task-recurrence-field">
        <span>Repeats</span>
        <button type="button" className="task-recurrence-disabled" disabled><Repeat2 size={13} /> Add a deadline first</button>
      </div>
    )
  }

  const selectedValue = customOpen ? "custom" : task.recurrence_unit ?? "none"
  const choosePreset = (value: string) => {
    if (value === "custom") {
      setCustomOpen(true)
      if (!task.recurrence_unit) onChange({ recurrence_unit: "weekly", recurrence_interval: 1 })
      return
    }
    setCustomOpen(false)
    setEndMode("never")
    onChange(value === "none"
      ? { recurrence_unit: null, recurrence_interval: 1, recurrence_end_date: null, recurrence_limit: null }
      : { recurrence_unit: value as TaskRecurrence, recurrence_interval: 1, recurrence_end_date: null, recurrence_limit: null })
  }
  const saveInterval = () => {
    const next = Math.max(1, Math.min(365, Number(interval) || 1))
    setInterval(String(next))
    onChange({ recurrence_interval: next })
  }
  const saveLimit = () => {
    const next = Math.max(2, Math.min(999, Number(limit) || 2))
    setLimit(String(next))
    onChange({ recurrence_limit: next, recurrence_end_date: null })
  }

  return (
    <div className="task-recurrence-field">
      <span>Repeats</span>
      <SelectDropdown value={selectedValue} options={RECURRENCE_OPTIONS} ariaLabel="Task recurrence" onChange={choosePreset} />
      {customOpen && task.recurrence_unit && (
        <div className="task-recurrence-custom">
          <div><span>Every</span><input type="number" min="1" max="365" value={interval} onChange={(event) => setInterval(event.target.value)} onBlur={saveInterval} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur() }} /><SelectDropdown size="compact" value={task.recurrence_unit} options={UNIT_OPTIONS} ariaLabel="Recurrence unit" onChange={(value) => onChange({ recurrence_unit: value as TaskRecurrence })} /></div>
          <div><span>Ends</span><SelectDropdown size="compact" value={endMode} options={[{ value: "never", label: "Never" }, { value: "date", label: "On date" }, { value: "count", label: "After occurrences" }]} ariaLabel="Recurrence ending" onChange={(value) => { const mode = value as typeof endMode; setEndMode(mode); if (mode === "never") onChange({ recurrence_end_date: null, recurrence_limit: null }) }} /></div>
          {endMode === "date" && <div className="task-recurrence-end"><span>On</span><DatePicker value={task.recurrence_end_date ?? ""} onChange={(value) => onChange({ recurrence_end_date: value || null, recurrence_limit: null })} ariaLabel="Recurrence end date" placeholder="Choose end date" /></div>}
          {endMode === "count" && <div className="task-recurrence-end"><span>After</span><input type="number" min="2" max="999" value={limit} onChange={(event) => setLimit(event.target.value)} onBlur={saveLimit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur() }} /><small>occurrences</small></div>}
        </div>
      )}
    </div>
  )
}

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
    (value: string) => {
      updateTask.mutate({ id, data: { deadline: value || null } })
    },
    [id, updateTask],
  )

  const handleProjectChange = useCallback(
    (projectId: number | null) => {
      updateTask.mutate({ id, data: { project_id: projectId } })
    },
    [id, updateTask],
  )

  const handleRecurrenceChange = useCallback(
    (data: TaskUpdate) => { updateTask.mutate({ id, data }) },
    [id, updateTask],
  )

  const handleArchiveToggle = useCallback(() => {
    if (task?.archived_at) {
      unarchiveTask.mutate(id)
    } else {
      archiveTask.mutate(id)
    }
  }, [id, task, archiveTask, unarchiveTask])

  const handleReturn = useCallback(async () => {
    if (!task) return
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current)
      titleDebounceRef.current = null
    }
    if (descDebounceRef.current) {
      clearTimeout(descDebounceRef.current)
      descDebounceRef.current = null
    }

    try {
      const resolvedTitle = shouldAutoName(title)
        ? deriveEntryTitle(description, "Untitled Task")
        : title.trim()
      await updateTask.mutateAsync({
        id,
        data: { title: resolvedTitle, description },
      })
      await navigate({ to: "/tasks" })
    } catch {
      // Keep the editor open so the user can retry without losing their changes.
    }
  }, [description, id, navigate, task, title, updateTask])

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
        <button type="button" className="entry-return-button" onClick={() => void handleReturn()} disabled={updateTask.isPending}>
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Tasks</span>
        </button>
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

        {/* Tags + Project */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px", flexWrap: "wrap" }}>
          <TagInput entityType="task" entityId={id} />
          <ProjectDropdown
            entityType="task"
            entityId={id}
            currentProjectId={task.project_id}
            onProjectChange={handleProjectChange}
          />
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
          <DatePicker
            value={deadlineValue}
            onChange={handleDeadlineChange}
            ariaLabel="Task deadline"
            placeholder="No deadline"
          />
          <TaskRecurrenceControl task={task} onChange={handleRecurrenceChange} />
        </div>

        <div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500, color: "var(--text-3)", lineHeight: 1.5, marginBottom: "6px", display: "block" }}>
            Description
          </span>
          <textarea
            id="body"
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

        <TaskStateHistory taskId={id} />
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
