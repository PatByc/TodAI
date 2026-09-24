import { createFileRoute } from "@tanstack/react-router"
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { DatePicker } from "@/components/ui/DatePicker"
import { SelectDropdown } from "@/components/ui/SelectDropdown"
import {
  useCreateTimeEntry,
  useDeleteTimeEntry,
  useTimeEntries,
  useTimeStreams,
  useUpdateTimeEntry,
} from "@/hooks/useTimeConfiguration"
import { useProjects } from "@/hooks/useProjects"
import { WORKSPACE_COLORS } from "@/lib/colorPalette"
import { durationLabel, localDateValue, localTimeValue, parseServerTime } from "@/lib/time"
import type { TimeEntry, TimeEntryCreate, TimeStream } from "@/types/entities"

export const Route = createFileRoute("/time/")({ component: TimePage })

function toFormValues(entry?: TimeEntry) {
  const end = entry?.ended_at ? parseServerTime(entry.ended_at) : new Date()
  const start = entry ? parseServerTime(entry.started_at) : new Date(end.getTime() - 60 * 60 * 1000)
  return {
    date: localDateValue(start),
    start: localTimeValue(start),
    end: localTimeValue(end),
    streamId: entry?.stream_id ? String(entry.stream_id) : "none",
    categoryId: entry?.category_id ? String(entry.category_id) : "none",
    projectId: entry?.project_id ? String(entry.project_id) : "none",
    notes: entry?.notes ?? "",
  }
}

function entryPayload(values: ReturnType<typeof toFormValues>): TimeEntryCreate {
  const startedAt = new Date(`${values.date}T${values.start}:00`)
  let endedAt = new Date(`${values.date}T${values.end}:00`)
  if (endedAt <= startedAt) endedAt = new Date(endedAt.getTime() + 24 * 60 * 60 * 1000)
  return {
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    stream_id: values.streamId === "none" ? undefined : Number(values.streamId),
    category_id: values.categoryId === "none" ? undefined : Number(values.categoryId),
    project_id: values.projectId === "none" ? undefined : Number(values.projectId),
    notes: values.notes.trim() || undefined,
  }
}

function DailyTimeline({ entries, streams, loading }: {
  entries: TimeEntry[]
  streams: TimeStream[]
  loading: boolean
}) {
  const running = entries.some((entry) => entry.ended_at === null)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [running])

  const current = new Date(now)
  const dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime()
  const dayEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1).getTime()
  const dayLength = dayEnd - dayStart
  const streamById = new Map(streams.map((stream) => [stream.id, stream]))
  const ordered = [...entries].sort((first, second) => first.started_at.localeCompare(second.started_at))
  const intervals = ordered.map((entry) => {
    const start = Math.max(parseServerTime(entry.started_at).getTime(), dayStart)
    const end = Math.min(entry.ended_at ? parseServerTime(entry.ended_at).getTime() : now, dayEnd)
    const seconds = Math.max(0, Math.floor((end - start) / 1000))
    const stream = entry.stream_id ? streamById.get(entry.stream_id) : undefined
    const category = stream?.categories.find((item) => item.id === entry.category_id)
    return { entry, start, end, seconds, stream, label: category?.name ?? stream?.name ?? "Unassigned" }
  }).filter((interval) => interval.end > interval.start)
  const totalSeconds = intervals.reduce((sum, interval) => sum + interval.seconds, 0)

  return (
    <section className="home-time time-page-timeline" aria-labelledby="time-today-title">
      <div className="home-section-head">
        <h2 id="time-today-title">Tracked today</h2>
        {!loading && <span className="time-page-timeline-total">{durationLabel(totalSeconds)}</span>}
      </div>
      <div className={`home-time-rail${loading ? " is-loading" : ""}`}>
        <div className="home-time-scale" aria-hidden="true">
          {[0, 6, 12, 18, 24].map((hour) => <span key={hour} style={{ left: `${hour / 24 * 100}%` }}>{String(hour).padStart(2, "0")}</span>)}
        </div>
        <div className="home-time-track" aria-label="Today time timeline">
          {intervals.map(({ entry, start, end, seconds, stream, label }) => (
            <span
              key={entry.id}
              className={`home-time-segment${entry.ended_at ? "" : " is-running"}`}
              style={{
                left: `${(start - dayStart) / dayLength * 100}%`,
                width: `${Math.max((end - start) / dayLength * 100, .32)}%`,
                background: stream ? WORKSPACE_COLORS[stream.color_index % WORKSPACE_COLORS.length].value : undefined,
              }}
              title={`${localTimeValue(new Date(start))}–${entry.ended_at ? localTimeValue(new Date(end)) : "now"} · ${label} · ${durationLabel(seconds)}`}
              aria-label={`${label}, ${durationLabel(seconds)}`}
            />
          ))}
        </div>
      </div>
      {!loading && intervals.length === 0 ? (
        <p className="home-time-empty">No time tracked yet. Use the timer when you begin.</p>
      ) : (
        <div className="home-time-legend">
          {intervals.slice(0, 5).map(({ entry, start, seconds, stream, label }) => (
            <span key={entry.id}>
              <i
                className={entry.ended_at ? "" : "is-running"}
                style={{ background: entry.ended_at && stream ? WORKSPACE_COLORS[stream.color_index % WORKSPACE_COLORS.length].value : undefined }}
              />
              <time>{localTimeValue(new Date(start))}</time>
              <strong>{label}</strong>
              <small>{entry.ended_at ? durationLabel(seconds) : "Running"}</small>
            </span>
          ))}
          {intervals.length > 5 && <span className="home-time-more">+{intervals.length - 5} more</span>}
        </div>
      )}
    </section>
  )
}

function EntryForm({ entry, streams, onClose }: {
  entry?: TimeEntry
  streams: TimeStream[]
  onClose: () => void
}) {
  const [values, setValues] = useState(() => toFormValues(entry))
  const [error, setError] = useState("")
  const createEntry = useCreateTimeEntry()
  const updateEntry = useUpdateTimeEntry()
  const { data: projects } = useProjects({ limit: 100 })
  const pending = createEntry.isPending || updateEntry.isPending
  const activeStreams = streams.filter((stream) => stream.is_active || stream.id === entry?.stream_id)
  const selectedStream = streams.find((stream) => String(stream.id) === values.streamId)
  const categories = selectedStream?.categories.filter(
    (category) => category.is_active || category.id === entry?.category_id,
  ) ?? []

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    if (!values.date || !values.start || !values.end) {
      setError("Choose a date, start time, and end time.")
      return
    }
    try {
      const payload = entryPayload(values)
      if (entry) {
        await updateEntry.mutateAsync({
          id: entry.id,
          data: {
            ...payload,
            stream_id: payload.stream_id ?? null,
            category_id: payload.category_id ?? null,
            project_id: payload.project_id ?? null,
            notes: payload.notes ?? null,
          },
        })
      } else {
        await createEntry.mutateAsync(payload)
      }
      onClose()
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Could not save this time entry.")
    }
  }

  return (
    <form className="time-entry-form" onSubmit={(event) => void submit(event)}>
      <div className="time-entry-form-head">
        <div>
          <h2>{entry ? "Edit entry" : "Add time"}</h2>
          <p>{entry ? "Adjust the recorded interval and its context." : "Record time that was not captured by the timer."}</p>
        </div>
        <button type="button" className="time-entry-close" onClick={onClose} aria-label="Close form"><X size={16} /></button>
      </div>
      <div className="time-entry-fields">
        <div className="time-entry-field time-entry-date">
          <span>Date</span>
          <DatePicker value={values.date} onChange={(date) => setValues({ ...values, date })} ariaLabel="Entry date" />
        </div>
        <label className="time-entry-field">
          <span>Start</span>
          <input type="time" value={values.start} onChange={(event) => setValues({ ...values, start: event.target.value })} required />
        </label>
        <label className="time-entry-field">
          <span>End</span>
          <input type="time" value={values.end} onChange={(event) => setValues({ ...values, end: event.target.value })} required />
        </label>
        <div className="time-entry-field">
          <span>Stream</span>
          <SelectDropdown
            value={values.streamId}
            ariaLabel="Time stream"
            options={[
              { value: "none", label: "No stream" },
              ...activeStreams.map((stream) => ({
                value: String(stream.id),
                label: stream.name,
                color: WORKSPACE_COLORS[stream.color_index % WORKSPACE_COLORS.length].value,
              })),
            ]}
            onChange={(streamId) => setValues({ ...values, streamId, categoryId: "none" })}
          />
        </div>
        <div className="time-entry-field">
          <span>Category</span>
          <SelectDropdown
            value={values.categoryId}
            ariaLabel="Time category"
            options={[
              { value: "none", label: "No category" },
              ...categories.map((category) => ({ value: String(category.id), label: category.name })),
            ]}
            onChange={(categoryId) => setValues({ ...values, categoryId })}
          />
        </div>
        <div className="time-entry-field">
          <span>Project</span>
          <SelectDropdown
            value={values.projectId}
            ariaLabel="Project"
            options={[
              { value: "none", label: "No project" },
              ...(projects?.items ?? []).map((project) => ({ value: String(project.id), label: project.name })),
            ]}
            onChange={(projectId) => setValues({ ...values, projectId })}
          />
        </div>
        <label className="time-entry-field time-entry-notes">
          <span>Note</span>
          <input type="text" maxLength={5000} value={values.notes} placeholder="What did you work on?" onChange={(event) => setValues({ ...values, notes: event.target.value })} />
        </label>
      </div>
      <div className="time-entry-form-actions">
        {error && <p role="alert">{error}</p>}
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="time-entry-save" disabled={pending}><Check size={14} /> {pending ? "Saving…" : "Save entry"}</button>
      </div>
    </form>
  )
}

function TimePage() {
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const [historyPeriod, setHistoryPeriod] = useState<"day" | "week" | "month">("week")
  const [historyAnchor, setHistoryAnchor] = useState(() => new Date())
  const historyBounds = useMemo(() => {
    if (historyPeriod === "day") return [new Date(historyAnchor.getFullYear(), historyAnchor.getMonth(), historyAnchor.getDate()), new Date(historyAnchor.getFullYear(), historyAnchor.getMonth(), historyAnchor.getDate() + 1)]
    if (historyPeriod === "week") {
      const offset = (historyAnchor.getDay() + 6) % 7
      return [new Date(historyAnchor.getFullYear(), historyAnchor.getMonth(), historyAnchor.getDate() - offset), new Date(historyAnchor.getFullYear(), historyAnchor.getMonth(), historyAnchor.getDate() - offset + 7)]
    }
    return [new Date(historyAnchor.getFullYear(), historyAnchor.getMonth(), 1), new Date(historyAnchor.getFullYear(), historyAnchor.getMonth() + 1, 1)]
  }, [historyAnchor, historyPeriod])
  const { data: entries = [], isLoading, error } = useTimeEntries({ limit: 500, from_at: historyBounds[0].toISOString(), to_at: historyBounds[1].toISOString() })
  const { data: todayEntries = [], isLoading: todayLoading } = useTimeEntries({
    limit: 500,
    from_at: dayStart.toISOString(),
    to_at: dayEnd.toISOString(),
  })
  const { data: streams = [] } = useTimeStreams()
  const { data: projects } = useProjects({ limit: 100, include_archived: true })
  const deleteEntry = useDeleteTimeEntry()
  const [formEntry, setFormEntry] = useState<TimeEntry | "new" | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [mutationError, setMutationError] = useState("")
  const today = localDateValue()

  const groups = useMemo(() => {
    const grouped = new Map<string, TimeEntry[]>()
    for (const entry of entries) {
      const key = localDateValue(parseServerTime(entry.started_at))
      grouped.set(key, [...(grouped.get(key) ?? []), entry])
    }
    return [...grouped.entries()]
  }, [entries])

  const streamById = new Map(streams.map((stream) => [stream.id, stream]))
  const projectById = new Map((projects?.items ?? []).map((project) => [project.id, project]))

  const removeEntry = async (entryId: number) => {
    setMutationError("")
    try {
      await deleteEntry.mutateAsync(entryId)
      setConfirmDeleteId(null)
    } catch (deleteError) {
      setMutationError(deleteError instanceof Error ? deleteError.message : "Could not delete this entry.")
    }
  }

  const historyTotal = entries.reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0)
  const allocations = [...entries.reduce((totals, entry) => {
    const key = entry.stream_id ?? 0
    totals.set(key, (totals.get(key) ?? 0) + (entry.duration_seconds ?? 0))
    return totals
  }, new Map<number, number>())].sort((first, second) => second[1] - first[1])
  const historyLabel = historyPeriod === "day"
    ? new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(historyBounds[0])
    : `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(historyBounds[0])} – ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(historyBounds[1].getTime() - 1))}`
  const moveHistory = (direction: number) => {
    const next = new Date(historyAnchor)
    if (historyPeriod === "day") next.setDate(next.getDate() + direction)
    else if (historyPeriod === "week") next.setDate(next.getDate() + direction * 7)
    else next.setMonth(next.getMonth() + direction)
    setHistoryAnchor(next)
  }

  return (
    <div className="time-page">
      <div className="time-page-head">
        <div><h1>Time</h1><p>A precise record of where the day went.</p></div>
        <button type="button" onClick={() => setFormEntry("new")} disabled={formEntry !== null}><Plus size={14} /> Add entry</button>
      </div>

      {formEntry && (
        <EntryForm
          key={formEntry === "new" ? "new" : formEntry.id}
          entry={formEntry === "new" ? undefined : formEntry}
          streams={streams}
          onClose={() => setFormEntry(null)}
        />
      )}

      <DailyTimeline entries={todayEntries} streams={streams} loading={todayLoading} />

      <section className="time-history" aria-labelledby="time-history-title">
        <div className="time-history-head">
          <div><h2 id="time-history-title">History</h2><span>{historyLabel}</span></div>
          <div className="time-history-controls">
            <div className="time-period-switch" aria-label="History range">{(["day", "week", "month"] as const).map((period) => <button type="button" key={period} className={historyPeriod === period ? "is-active" : ""} onClick={() => { setHistoryPeriod(period); setHistoryAnchor(new Date()) }}>{period}</button>)}</div>
            <button type="button" onClick={() => moveHistory(-1)} aria-label={`Previous ${historyPeriod}`}><ChevronLeft size={14} /></button>
            <button type="button" onClick={() => setHistoryAnchor(new Date())}>Now</button>
            <button type="button" onClick={() => moveHistory(1)} aria-label={`Next ${historyPeriod}`}><ChevronRight size={14} /></button>
          </div>
        </div>
        {!isLoading && entries.length > 0 && <div className="time-allocation"><div className="time-allocation-total"><strong>{durationLabel(historyTotal)}</strong><span>tracked</span></div><div className="time-allocation-bars">{allocations.map(([streamId, seconds]) => {
          const stream = streamById.get(streamId)
          const color = stream ? WORKSPACE_COLORS[stream.color_index % WORKSPACE_COLORS.length].value : "#69726e"
          return <div key={streamId}><span><i style={{ background: color }} />{stream?.name ?? "Unassigned"}</span><div><i style={{ width: `${historyTotal ? seconds / historyTotal * 100 : 0}%`, background: color }} /></div><strong>{durationLabel(seconds)}</strong></div>
        })}</div></div>}
      </section>

      {mutationError && <p className="time-entry-error" role="alert">{mutationError}</p>}
      {isLoading ? <p className="time-entry-state">Loading time…</p> : error ? (
        <p className="time-entry-error" role="alert">Could not load time entries.</p>
      ) : groups.length === 0 ? (
        <div className="time-entry-empty"><strong>No time recorded yet.</strong><p>Start the timer or add an entry manually.</p></div>
      ) : (
        <div className="time-entry-groups">
          {groups.map(([date, dateEntries]) => {
            const total = dateEntries.reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0)
            const isToday = date === today
            const heading = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${date}T12:00:00`))
            return (
              <section className={`time-entry-group${isToday ? " is-today" : ""}`} key={date}>
                {!isToday && <div className="time-entry-group-head"><h2>{heading}</h2><span>{durationLabel(total)}</span></div>}
                <div className="time-entry-list">
                  {dateEntries.map((entry) => {
                    const start = parseServerTime(entry.started_at)
                    const end = entry.ended_at ? parseServerTime(entry.ended_at) : null
                    const stream = entry.stream_id ? streamById.get(entry.stream_id) : undefined
                    const category = stream?.categories.find((item) => item.id === entry.category_id)
                    const project = entry.project_id ? projectById.get(entry.project_id) : undefined
                    return (
                      <article className={`time-entry-row${end ? "" : " is-running"}`} key={entry.id}>
                        <span className="time-entry-color" style={{ background: stream ? WORKSPACE_COLORS[stream.color_index % WORKSPACE_COLORS.length].value : undefined }} />
                        <time>{localTimeValue(start)}<span>—</span>{end ? localTimeValue(end) : "Now"}</time>
                        <div className="time-entry-context">
                          <strong>{category?.name ?? stream?.name ?? "Unassigned"}</strong>
                          {(entry.notes || project) && <span>{[entry.notes, project?.name].filter(Boolean).join(" · ")}</span>}
                        </div>
                        <span className="time-entry-duration">{end ? durationLabel(entry.duration_seconds ?? 0) : "Running"}</span>
                        {end && <div className="time-entry-actions">
                          <button type="button" onClick={() => { setFormEntry(entry); setConfirmDeleteId(null) }} aria-label="Edit time entry"><Pencil size={13} /></button>
                          {confirmDeleteId === entry.id ? (
                            <>
                              <button type="button" className="is-confirm" onClick={() => void removeEntry(entry.id)}>Delete</button>
                              <button type="button" onClick={() => setConfirmDeleteId(null)} aria-label="Cancel deletion"><X size={13} /></button>
                            </>
                          ) : (
                            <button type="button" onClick={() => setConfirmDeleteId(entry.id)} aria-label="Delete time entry"><Trash2 size={13} /></button>
                          )}
                        </div>}
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
