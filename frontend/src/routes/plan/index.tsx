import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Check, ChevronLeft, ChevronRight, GripVertical, Plus, Trash2, X } from "lucide-react"
import { createPortal } from "react-dom"
import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, FormEvent, FocusEvent as ReactFocusEvent, PointerEvent as ReactPointerEvent } from "react"
import { DatePicker } from "@/components/ui/DatePicker"
import { SelectDropdown } from "@/components/ui/SelectDropdown"
import { useCreatePlannedBlock, useDeletePlannedBlock, usePlannedBlocks, useRoutines, useUpdatePlannedBlock } from "@/hooks/usePlanning"
import { useProjects } from "@/hooks/useProjects"
import { useTasks, useUpdateTask } from "@/hooks/useTasks"
import { useTimeStreams } from "@/hooks/useTimeConfiguration"
import { WORKSPACE_COLORS } from "@/lib/colorPalette"
import { localDateValue, parseServerTime } from "@/lib/time"
import type { PlannedBlock, Routine, Task, TimeStream } from "@/types/entities"

export const Route = createFileRoute("/plan/")({ component: PlanPage })

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const CALENDAR_START = 6
const CALENDAR_END = 24
const HOUR_HEIGHT = 52
const TOOLTIP_DESCRIPTION_LIMIT = 180

interface PlanTooltipContent {
  type: "Planned time" | "Task" | "All-day task" | "Routine"
  title: string
  description: string | null
  meta: string
  color: string
  delay?: number
}

interface VisiblePlanTooltip extends PlanTooltipContent {
  left: number
  top: number
  anchor: number
  placement: "above" | "below"
}

function previewDescription(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (normalized.length <= TOOLTIP_DESCRIPTION_LIMIT) return normalized
  const draft = normalized.slice(0, TOOLTIP_DESCRIPTION_LIMIT + 1)
  const boundary = draft.lastIndexOf(" ")
  return `${draft.slice(0, boundary > 120 ? boundary : TOOLTIP_DESCRIPTION_LIMIT).trimEnd()}…`
}

function PlanEntryTooltip({ tooltip }: { tooltip: VisiblePlanTooltip | null }) {
  if (!tooltip) return null
  return createPortal(
    <aside
      id="plan-entry-tooltip"
      role="tooltip"
      className={`plan-entry-tooltip is-${tooltip.placement}`}
      style={{
        left: tooltip.left,
        top: tooltip.top,
        "--tooltip-anchor": `${tooltip.anchor}px`,
        "--tooltip-color": tooltip.color,
      } as CSSProperties}
    >
      <div className="plan-entry-tooltip-meta"><span>{tooltip.type}</span><time>{tooltip.meta}</time></div>
      <strong>{tooltip.title}</strong>
      <p>{previewDescription(tooltip.description ?? "")}</p>
    </aside>,
    document.body,
  )
}

function BlockForm({ block, seed, onClose }: { block?: PlannedBlock; seed?: Date; onClose: () => void }) {
  const { data: streams = [] } = useTimeStreams()
  const { data: projects } = useProjects({ limit: 100 })
  const initialStart = block ? parseServerTime(block.starts_at) : seed ?? new Date()
  const initialEnd = block ? parseServerTime(block.ends_at) : new Date(initialStart.getTime() + 60 * 60 * 1000)
  const [title, setTitle] = useState(block?.title ?? "")
  const [description, setDescription] = useState(block?.description ?? "")
  const [date, setDate] = useState(localDateValue(initialStart))
  const [start, setStart] = useState(`${String(initialStart.getHours()).padStart(2, "0")}:${String(initialStart.getMinutes()).padStart(2, "0")}`)
  const [end, setEnd] = useState(`${String(initialEnd.getHours()).padStart(2, "0")}:${String(initialEnd.getMinutes()).padStart(2, "0")}`)
  const [streamId, setStreamId] = useState(block?.stream_id ? String(block.stream_id) : "none")
  const [projectId, setProjectId] = useState(block?.project_id ? String(block.project_id) : "none")
  const [error, setError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const create = useCreatePlannedBlock()
  const update = useUpdatePlannedBlock()
  const remove = useDeletePlannedBlock()
  const pending = create.isPending || update.isPending || remove.isPending

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const startsAt = new Date(`${date}T${start}:00`)
    const endsAt = new Date(`${date}T${end}:00`)
    if (endsAt < startsAt) endsAt.setDate(endsAt.getDate() + 1)
    if (!title.trim() || !date || !start || !end || endsAt <= startsAt) return setError("Add a title and choose an end time after the start.")
    const data = {
      title: title.trim(), description: description.trim() || undefined,
      starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
      stream_id: streamId === "none" ? undefined : Number(streamId),
      project_id: projectId === "none" ? undefined : Number(projectId),
    }
    try {
      if (block) await update.mutateAsync({ id: block.id, data: { ...data, description: data.description ?? null, stream_id: data.stream_id ?? null, project_id: data.project_id ?? null } })
      else await create.mutateAsync(data)
      onClose()
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Could not save this calendar block.")
    }
  }

  const deleteBlock = async () => {
    if (!block) return
    if (!confirmDelete) return setConfirmDelete(true)
    await remove.mutateAsync(block.id)
    onClose()
  }

  return <form className="plan-editor plan-block-editor plan-block-drawer" onSubmit={(event) => void submit(event)}>
    <div className="plan-editor-head"><div><h2>{block ? "Edit plan" : "Plan time"}</h2><p>Reserve a concrete part of the week.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={15} /></button></div>
    <div className="plan-editor-fields plan-block-fields">
      <label><span>What</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Focus block" autoFocus /></label>
      <div><span>Date</span><DatePicker value={date} onChange={setDate} ariaLabel="Plan date" /></div>
      <label><span>Start</span><input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
      <label><span>End</span><input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
      <div><span>Stream</span><SelectDropdown value={streamId} ariaLabel="Plan stream" options={[{ value: "none", label: "No stream" }, ...streams.filter((item) => item.is_active || item.id === block?.stream_id).map((item) => ({ value: String(item.id), label: item.name, color: WORKSPACE_COLORS[item.color_index % WORKSPACE_COLORS.length].value }))]} onChange={setStreamId} /></div>
      <div><span>Project</span><SelectDropdown value={projectId} ariaLabel="Plan project" options={[{ value: "none", label: "No project" }, ...(projects?.items ?? []).map((item) => ({ value: String(item.id), label: item.name }))]} onChange={setProjectId} /></div>
      <label className="plan-editor-description"><span>Note</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional context" /></label>
    </div>
    <div className="plan-editor-actions">{block && <button type="button" className={confirmDelete ? "is-danger" : ""} onClick={() => void deleteBlock()}><Trash2 size={13} /> {confirmDelete ? "Confirm delete" : "Delete"}</button>}{error && <p role="alert">{error}</p>}<button type="button" onClick={onClose}>Cancel</button><button className="is-primary" type="submit" disabled={pending}><Check size={14} /> {pending ? "Saving…" : "Save plan"}</button></div>
  </form>
}

function WeekCalendar({ dates, blocks, routines, tasks, streams, onCreate, onEdit, onMove, onResize, onMoveTask, onEditRoutine, onOpenTask }: {
  dates: Date[]
  blocks: PlannedBlock[]
  routines: Routine[]
  tasks: Task[]
  streams: TimeStream[]
  onCreate: (date: Date) => void
  onEdit: (block: PlannedBlock) => void
  onMove: (block: PlannedBlock, startsAt: Date, endsAt: Date) => void
  onResize: (block: PlannedBlock, endsAt: Date) => void
  onMoveTask: (task: Task, deadline: Date) => void
  onEditRoutine: (routine: Routine) => void
  onOpenTask: (task: Task) => void
}) {
  const calendarShell = useRef<HTMLDivElement>(null)
  const centeredOnArrival = useRef(false)
  const [taskDrop, setTaskDrop] = useState<{ dayIndex: number; top: number; time: string } | null>(null)
  const [resizing, setResizing] = useState<{ blockId: number; endsAt: Date } | null>(null)
  const [tooltip, setTooltip] = useState<VisiblePlanTooltip | null>(null)
  const tooltipTimer = useRef<number | null>(null)
  const suppressBlockClick = useRef<number | null>(null)
  const today = localDateValue()
  const now = new Date()
  const streamById = new Map(streams.map((stream) => [stream.id, stream]))
  const topFor = (date: Date) => Math.max(0, (date.getHours() + date.getMinutes() / 60 - CALENDAR_START) * HOUR_HEIGHT)
  const calendarHeight = (CALENDAR_END - CALENDAR_START) * HOUR_HEIGHT
  const hideTooltip = () => {
    if (tooltipTimer.current !== null) window.clearTimeout(tooltipTimer.current)
    tooltipTimer.current = null
    setTooltip(null)
  }
  const showTooltip = (target: HTMLElement, content: PlanTooltipContent) => {
    if (!content.description?.trim()) return
    if (tooltipTimer.current !== null) window.clearTimeout(tooltipTimer.current)
    const rect = target.getBoundingClientRect()
    const width = Math.min(292, window.innerWidth - 24)
    const center = rect.left + rect.width / 2
    const left = Math.max(12, Math.min(center - width / 2, window.innerWidth - width - 12))
    const placement = rect.bottom + 150 < window.innerHeight ? "below" : "above"
    const top = placement === "below" ? rect.bottom + 9 : rect.top - 9
    tooltipTimer.current = window.setTimeout(() => {
      setTooltip({
        ...content,
        left,
        top,
        anchor: Math.max(18, Math.min(center - left, width - 18)),
        placement,
      })
      tooltipTimer.current = null
    }, content.delay ?? 320)
  }
  const tooltipProps = (content: PlanTooltipContent) => content.description?.trim() ? {
    "aria-describedby": "plan-entry-tooltip",
    onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => showTooltip(event.currentTarget, content),
    onPointerLeave: hideTooltip,
    onFocus: (event: ReactFocusEvent<HTMLElement>) => showTooltip(event.currentTarget, content),
    onBlur: hideTooltip,
  } : {}

  useEffect(() => {
    const dismiss = () => hideTooltip()
    window.addEventListener("resize", dismiss)
    window.addEventListener("scroll", dismiss, true)
    return () => {
      window.removeEventListener("resize", dismiss)
      window.removeEventListener("scroll", dismiss, true)
      if (tooltipTimer.current !== null) window.clearTimeout(tooltipTimer.current)
    }
  }, [])

  useEffect(() => {
    if (centeredOnArrival.current) return
    const frame = window.requestAnimationFrame(() => {
      const shell = calendarShell.current
      const calendarBody = shell?.querySelector<HTMLElement>(".plan-calendar-body")
      if (!shell || !calendarBody || shell.clientHeight === 0) return

      const currentHour = now.getHours() + now.getMinutes() / 60
      const currentPosition = Math.max(0, currentHour - CALENDAR_START) * HOUR_HEIGHT
      shell.scrollTo({
        top: Math.max(0, calendarBody.offsetTop + currentPosition - shell.clientHeight / 2),
        behavior: "auto",
      })
      centeredOnArrival.current = true
    })
    return () => window.cancelAnimationFrame(frame)
  }, [now])

  const beginResize = (event: ReactPointerEvent<HTMLSpanElement>, block: PlannedBlock) => {
    hideTooltip()
    event.preventDefault()
    event.stopPropagation()
    const originY = event.clientY
    const start = parseServerTime(block.starts_at)
    const originalEnd = parseServerTime(block.ends_at)
    const latestEnd = new Date(start); latestEnd.setHours(CALENDAR_END, 0, 0, 0)
    let nextEnd = originalEnd
    const move = (pointerEvent: PointerEvent) => {
      const deltaMinutes = Math.round(((pointerEvent.clientY - originY) / HOUR_HEIGHT * 60) / 30) * 30
      const candidate = new Date(originalEnd.getTime() + deltaMinutes * 60_000)
      const earliestEnd = new Date(start.getTime() + 30 * 60_000)
      nextEnd = new Date(Math.min(latestEnd.getTime(), Math.max(earliestEnd.getTime(), candidate.getTime())))
      setResizing({ blockId: block.id, endsAt: nextEnd })
    }
    const finish = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", finish)
      window.removeEventListener("pointercancel", cancel)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      setResizing(null)
      if (nextEnd.getTime() !== originalEnd.getTime()) {
        suppressBlockClick.current = block.id
        window.setTimeout(() => {
          if (suppressBlockClick.current === block.id) suppressBlockClick.current = null
        }, 0)
        onResize(block, nextEnd)
      }
    }
    const cancel = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", finish)
      window.removeEventListener("pointercancel", cancel)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      setResizing(null)
    }
    document.body.style.cursor = "ns-resize"
    document.body.style.userSelect = "none"
    setResizing({ blockId: block.id, endsAt: originalEnd })
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", finish)
    window.addEventListener("pointercancel", cancel)
  }
  const resizeWithKeyboard = (block: PlannedBlock, minutes: number) => {
    const start = parseServerTime(block.starts_at)
    const currentEnd = parseServerTime(block.ends_at)
    const latestEnd = new Date(start); latestEnd.setHours(CALENDAR_END, 0, 0, 0)
    const earliestEnd = new Date(start.getTime() + 30 * 60_000)
    const endsAt = new Date(Math.min(latestEnd.getTime(), Math.max(earliestEnd.getTime(), currentEnd.getTime() + minutes * 60_000)))
    if (endsAt.getTime() !== currentEnd.getTime()) onResize(block, endsAt)
  }

  return <div className="plan-calendar-shell" ref={calendarShell}>
    <div className="plan-calendar" style={{ "--calendar-hour-height": `${HOUR_HEIGHT}px`, "--calendar-height": `${calendarHeight}px` } as CSSProperties}>
      <div className="plan-calendar-head"><span />{dates.map((date, index) => <div key={localDateValue(date)} className={localDateValue(date) === today ? "is-today" : ""}><span>{DAYS[index]}</span><strong>{date.getDate()}</strong></div>)}</div>
      <div className="plan-calendar-body">
        <div className="plan-calendar-hours">{Array.from({ length: CALENDAR_END - CALENDAR_START + 1 }, (_, index) => <span key={index} style={{ top: index * HOUR_HEIGHT }}>{String(CALENDAR_START + index).padStart(2, "0")}:00</span>)}</div>
        {dates.map((date, dayIndex) => {
          const dateValue = localDateValue(date)
          const dayBlocks = blocks.filter((block) => localDateValue(parseServerTime(block.starts_at)) === dateValue)
          const dayRoutines = routines.filter((routine) => routine.weekdays.includes(dayIndex) && routine.scheduled_time)
          const dayTasks = tasks.filter((task) => task.deadline && localDateValue(parseServerTime(task.deadline)) === dateValue && parseServerTime(task.deadline).getHours() >= CALENDAR_START)
          return <div key={dateValue} className={`plan-calendar-day${dateValue === today ? " is-today" : ""}`} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTaskDrop(null) }} onDragOver={(event) => {
            event.preventDefault()
            if (!event.dataTransfer.types.includes("text/task-id")) return
            event.dataTransfer.dropEffect = "move"
            const rect = event.currentTarget.getBoundingClientRect()
            const maxMinutes = (CALENDAR_END - CALENDAR_START) * 60 - 30
            const minutes = Math.min(maxMinutes, Math.max(0, Math.round(((event.clientY - rect.top) / HOUR_HEIGHT * 60) / 30) * 30))
            const hour = CALENDAR_START + Math.floor(minutes / 60)
            const minute = minutes % 60
            setTaskDrop({ dayIndex, top: minutes / 60 * HOUR_HEIGHT, time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` })
          }} onDrop={(event) => {
            event.preventDefault()
            const task = tasks.find((item) => item.id === Number(event.dataTransfer.getData("text/task-id")))
            const block = blocks.find((item) => item.id === Number(event.dataTransfer.getData("text/planned-block")))
            const rect = event.currentTarget.getBoundingClientRect()
            const maxMinutes = (CALENDAR_END - CALENDAR_START) * 60 - 30
            const minutes = Math.min(maxMinutes, Math.max(0, Math.round(((event.clientY - rect.top) / HOUR_HEIGHT * 60) / 30) * 30))
            const startsAt = new Date(date); startsAt.setHours(CALENDAR_START + Math.floor(minutes / 60), minutes % 60, 0, 0)
            setTaskDrop(null)
            if (task) return onMoveTask(task, startsAt)
            if (!block) return
            const duration = parseServerTime(block.ends_at).getTime() - parseServerTime(block.starts_at).getTime()
            onMove(block, startsAt, new Date(startsAt.getTime() + duration))
          }} onDoubleClick={(event) => {
            if (event.target !== event.currentTarget) return
            const rect = event.currentTarget.getBoundingClientRect()
            const minutes = Math.round(((event.clientY - rect.top) / HOUR_HEIGHT * 60) / 30) * 30
            const seed = new Date(date)
            seed.setHours(CALENDAR_START + Math.floor(minutes / 60), minutes % 60, 0, 0)
            onCreate(seed)
          }}>
            {dateValue === today && now.getHours() >= CALENDAR_START && now.getHours() < CALENDAR_END && <i className="plan-calendar-now" style={{ top: topFor(now) }} />}
            {taskDrop?.dayIndex === dayIndex && <div className="plan-task-drop-marker" style={{ top: taskDrop.top }}><span>{taskDrop.time}</span></div>}
            {dayBlocks.map((block) => {
              const start = parseServerTime(block.starts_at)
              const end = resizing?.blockId === block.id ? resizing.endsAt : parseServerTime(block.ends_at)
              const stream = block.stream_id ? streamById.get(block.stream_id) : undefined
              const color = stream ? WORKSPACE_COLORS[stream.color_index % WORKSPACE_COLORS.length].value : "#76817c"
              const resizingThis = resizing?.blockId === block.id
              const timeRange = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}–${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`
              return <div role="button" tabIndex={0} draggable={!resizingThis} key={`block-${block.id}`} className={`plan-calendar-event is-block${resizingThis ? " is-resizing" : ""}`} style={{ top: topFor(start), height: Math.max(26, (end.getTime() - start.getTime()) / 3600000 * HOUR_HEIGHT), "--event-color": color } as CSSProperties} {...tooltipProps({ type: "Planned time", title: block.title, description: block.description, meta: timeRange, color })} onDragStart={(event) => { hideTooltip(); if ((event.target as HTMLElement).closest(".plan-calendar-resize-handle")) return event.preventDefault(); event.dataTransfer.setData("text/planned-block", String(block.id)); event.dataTransfer.effectAllowed = "move" }} onClick={() => { if (suppressBlockClick.current === block.id) { suppressBlockClick.current = null; return } onEdit(block) }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onEdit(block) } }}><time>{timeRange}</time><strong>{block.title}</strong><span role="separator" tabIndex={0} aria-label={`Resize ${block.title}. Use up or down arrows in 30 minute steps.`} className="plan-calendar-resize-handle" onPointerDown={(event) => beginResize(event, block)} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); event.stopPropagation(); resizeWithKeyboard(block, event.key === "ArrowUp" ? -30 : 30) } }} /></div>
            })}
            {dayRoutines.map((routine) => {
              const [hour = 7, minute = 0] = routine.scheduled_time?.split(":").map(Number) ?? []
              const eventDate = new Date(date); eventDate.setHours(hour, minute, 0, 0)
              return <button type="button" key={`routine-${routine.id}`} className="plan-calendar-event is-routine" style={{ top: topFor(eventDate), height: 32 }} {...tooltipProps({ type: "Routine", title: routine.title, description: routine.description, meta: routine.scheduled_time?.slice(0, 5) ?? "Anytime", color: "#67726d" })} onClick={() => onEditRoutine(routine)}><time>{routine.scheduled_time?.slice(0, 5) ?? "Anytime"}</time><strong>{routine.title}</strong></button>
            })}
            {dayTasks.map((task) => {
              const deadline = parseServerTime(task.deadline!)
              return <button type="button" draggable key={`task-${task.id}`} className="plan-calendar-event is-task" style={{ top: topFor(deadline), height: 27 }} {...tooltipProps({ type: "Task", title: task.title, description: task.description, meta: `${deadline.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} · drag to reschedule`, color: "#92815e" })} onDragStart={(event) => { hideTooltip(); event.dataTransfer.setData("text/task-id", String(task.id)); event.dataTransfer.effectAllowed = "move" }} onDragEnd={() => setTaskDrop(null)} onClick={() => onOpenTask(task)}><span>Task</span><strong>{task.title}</strong></button>
            })}
          </div>
        })}
      </div>
      <div className="plan-calendar-allday" aria-label="All-day plans"><span>All day</span>{dates.map((date, dayIndex) => {
        const dateValue = localDateValue(date)
        const allDayTasks = tasks.filter((task) => task.deadline && localDateValue(parseServerTime(task.deadline)) === dateValue && parseServerTime(task.deadline).getHours() < CALENDAR_START)
        const anytimeRoutines = routines.filter((routine) => routine.weekdays.includes(dayIndex) && !routine.scheduled_time)
        return <div key={dateValue}>{allDayTasks.map((task) => <button type="button" draggable key={`all-task-${task.id}`} className={task.description?.trim() ? "has-description" : undefined} {...tooltipProps({ type: "All-day task", title: task.title, description: task.description, meta: "All day · drag to schedule", color: "#92815e", delay: 160 })} onDragStart={(event) => { hideTooltip(); event.dataTransfer.setData("text/task-id", String(task.id)); event.dataTransfer.effectAllowed = "move" }} onClick={() => onOpenTask(task)}><i />{task.title}</button>)}{anytimeRoutines.map((routine) => <button type="button" key={`all-routine-${routine.id}`} className="is-routine" {...tooltipProps({ type: "Routine", title: routine.title, description: routine.description, meta: "Anytime", color: "#67726d" })} onClick={() => onEditRoutine(routine)}><i />{routine.title}</button>)}</div>
      })}</div>
    </div>
    <PlanEntryTooltip tooltip={tooltip} />
    <p className="plan-calendar-hint">Drag a task to schedule it. Double-click empty time to add a plan.</p>
  </div>
}

function PlanPage() {
  const navigate = useNavigate()
  const { data: routines = [] } = useRoutines()
  const { data: streams = [] } = useTimeStreams()
  const { data: tasks } = useTasks({ limit: 100 })
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const weekStart = useMemo(() => {
    const date = new Date(weekAnchor)
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    date.setHours(0, 0, 0, 0)
    return date
  }, [weekAnchor])
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index)), [weekStart])
  const weekEnd = useMemo(() => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7), [weekStart])
  const { data: blocks = [] } = usePlannedBlocks(weekStart.toISOString(), weekEnd.toISOString())
  const [editor, setEditor] = useState<{ value?: PlannedBlock; seed?: Date } | null>(null)
  const moveBlock = useUpdatePlannedBlock()
  const moveTask = useUpdateTask()
  const activeRoutines = routines.filter((routine) => routine.is_active)
  const activeTasks = (tasks?.items ?? []).filter((task) => task.status !== "done")
  const unscheduledTasks = activeTasks.filter((task) => !task.deadline)
  const weekLabel = `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(weekStart)} – ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(weekEnd.getTime() - 1))}`
  const moveWeek = (offset: number) => setWeekAnchor(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + offset * 7))

  return <div className="plan-page calendar-plan-page">
    {editor && <BlockForm block={editor.value} seed={editor.seed} onClose={() => setEditor(null)} />}

    <section className="plan-week" aria-labelledby="week-title">
      <div className="plan-calendar-toolbar">
        <div className="plan-calendar-identity"><h1 id="week-title">Plan</h1><span>{weekLabel}</span><small>Give the week a shape before it begins.</small></div>
        <div className="plan-calendar-controls"><button type="button" onClick={() => moveWeek(-1)} aria-label="Previous week"><ChevronLeft size={15} /></button><button type="button" onClick={() => setWeekAnchor(new Date())}>Today</button><button type="button" onClick={() => moveWeek(1)} aria-label="Next week"><ChevronRight size={15} /></button><i /><button type="button" className="plan-time-action" onClick={() => setEditor({ seed: new Date() })}><Plus size={14} /> Plan time</button></div>
      </div>
      {unscheduledTasks.length > 0 && <div className="plan-task-tray"><div><strong>Unscheduled</strong><span>{unscheduledTasks.length}</span></div><div>{unscheduledTasks.map((task) => <button type="button" draggable key={task.id} title="Drag into the calendar" onDragStart={(event) => { event.dataTransfer.setData("text/task-id", String(task.id)); event.dataTransfer.effectAllowed = "move" }} onClick={() => void navigate({ to: "/tasks/$taskId", params: { taskId: String(task.id) } })}><GripVertical size={12} /><span>{task.title}</span></button>)}</div></div>}
      <WeekCalendar dates={weekDates} blocks={blocks} routines={activeRoutines} tasks={activeTasks} streams={streams} onCreate={(seed) => setEditor({ seed })} onEdit={(value) => setEditor({ value })} onMove={(block, startsAt, endsAt) => moveBlock.mutate({ id: block.id, data: { starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() } })} onResize={(block, endsAt) => moveBlock.mutate({ id: block.id, data: { ends_at: endsAt.toISOString() } })} onMoveTask={(task, deadline) => moveTask.mutate({ id: task.id, data: { deadline: deadline.toISOString() } })} onEditRoutine={() => void navigate({ to: "/routines" })} onOpenTask={(task) => void navigate({ to: "/tasks/$taskId", params: { taskId: String(task.id) } })} />
    </section>
  </div>
}
