/**
 * Task detail route at /tasks/$taskId.
 * Full task editor with title, description, priority (1-5), urgency (1-5),
 * status select (5 states with dots), and deadline picker.
 * Auto-saves: debounced 1.5s for text, immediate for selects/date.
 */

import { createFileRoute } from "@tanstack/react-router"
import { useTask, useUpdateTask } from "@/hooks/useTasks"
import { StatusSelect } from "@/components/entities/StatusSelect"
import { PrioritySelect } from "@/components/entities/PrioritySelect"
import { TagBadge } from "@/components/entities/TagBadge"
import { formatRelativeTime } from "@/lib/format"
import { useState, useCallback, useRef, useEffect } from "react"
import type { TaskStatus } from "@/types/entities"

export const Route = createFileRoute("/tasks/$taskId")({
  component: TaskDetailPage,
})

function TaskDetailPage() {
  const { taskId } = Route.useParams()
  const id = Number(taskId)
  const { data: task, isLoading, error } = useTask(id)
  const updateTask = useUpdateTask()

  // Local state for debounced text fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const titleInitialized = useRef(false)
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize local state from fetched task
  useEffect(() => {
    if (task && !titleInitialized.current) {
      setTitle(task.title)
      setDescription(task.description ?? "")
      titleInitialized.current = true
    }
  }, [task])

  // Reset initialization flag when navigating to a different task
  useEffect(() => {
    titleInitialized.current = false
  }, [id])

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current)
      if (descDebounceRef.current) clearTimeout(descDebounceRef.current)
    }
  }, [])

  // Debounced title save (1.5s)
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

  // Debounced description save (1.5s)
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

  // Immediate saves for select/date fields
  const handleStatusChange = useCallback(
    (status: TaskStatus) => {
      updateTask.mutate({ id, data: { status } })
    },
    [id, updateTask],
  )

  const handlePriorityChange = useCallback(
    (priority: number) => {
      updateTask.mutate({ id, data: { priority } })
    },
    [id, updateTask],
  )

  const handleUrgencyChange = useCallback(
    (urgency: number) => {
      updateTask.mutate({ id, data: { urgency } })
    },
    [id, updateTask],
  )

  const handleDeadlineChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      updateTask.mutate({
        id,
        data: { deadline: value || undefined },
      })
    },
    [id, updateTask],
  )

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
  if (error || !task) {
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
          Task not found
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            color: "var(--muted-foreground)",
          }}
        >
          This task may have been deleted or doesn't exist.
        </p>
      </div>
    )
  }

  // Format deadline for date input (YYYY-MM-DD)
  const deadlineValue = task.deadline
    ? task.deadline.slice(0, 10)
    : ""

  return (
    <div>
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
          placeholder="Untitled Task"
          autoFocus={!task.title}
          style={{
            width: "100%",
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
          {task.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
          {task.tags.length > 0 && (
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
            Edited {formatRelativeTime(task.updated_at)}
          </span>
        </div>
      </div>

      {/* Task fields */}
      <div
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          padding: "0 40px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Status */}
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
            Status
          </span>
          <StatusSelect value={task.status} onChange={handleStatusChange} />
        </div>

        {/* Priority and Urgency side by side */}
        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
          <PrioritySelect
            value={task.priority}
            onChange={handlePriorityChange}
            label="Priority"
          />
          <PrioritySelect
            value={task.urgency}
            onChange={handleUrgencyChange}
            label="Urgency"
          />
        </div>

        {/* Deadline */}
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
            Deadline
          </span>
          <input
            type="date"
            value={deadlineValue}
            onChange={handleDeadlineChange}
            style={{
              appearance: "none",
              background: "var(--secondary)",
              color: deadlineValue ? "var(--foreground)" : "var(--muted-foreground)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "6px 12px",
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              lineHeight: 1.5,
              cursor: "pointer",
              outline: "none",
              colorScheme: "dark",
            }}
          />
        </div>

        {/* Description */}
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
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Add a description..."
            rows={6}
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
              minHeight: "120px",
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
            Created {formatRelativeTime(task.created_at)}
          </span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              color: "var(--text-3)",
              lineHeight: 1.5,
            }}
          >
            Updated {formatRelativeTime(task.updated_at)}
          </span>
          {task.status === "done" && task.completed_at && (
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                color: "#4EBE5E",
                lineHeight: 1.5,
              }}
            >
              Completed {formatRelativeTime(task.completed_at)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
