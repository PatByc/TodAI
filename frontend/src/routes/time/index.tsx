import { createFileRoute } from "@tanstack/react-router"
import { Check, Pencil, Plus, Trash2, X } from "lucide-react"
import { useMemo, useState } from "react"
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
import type { TimeEntry, TimeEntryCreate, TimeStream } from "@/types/entities"

export const Route = createFileRoute("/time/")({ component: TimePage })

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function localTimeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function parseServerTime(value: string) {
  return new Date(`${value}${/[zZ]|[+-]\d\d:\d\d$/.test(value) ? "" : "Z"}`)
}

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

function durationLabel(seconds: number) {
  if (seconds > 0 && seconds < 60) return "<1m"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours && minutes) return `${hours}h ${minutes}m`
  if (hours) return `${hours}h`
  return `${minutes}m`
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
  const { data: entries = [], isLoading, error } = useTimeEntries()
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

      {mutationError && <p className="time-entry-error" role="alert">{mutationError}</p>}
      {isLoading ? <p className="time-entry-state">Loading time…</p> : error ? (
        <p className="time-entry-error" role="alert">Could not load time entries.</p>
      ) : groups.length === 0 ? (
        <div className="time-entry-empty"><strong>No time recorded yet.</strong><p>Start the timer or add an entry manually.</p></div>
      ) : (
        <div className="time-entry-groups">
          {groups.map(([date, dateEntries]) => {
            const total = dateEntries.reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0)
            const heading = date === today ? "Today" : new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${date}T12:00:00`))
            return (
              <section className="time-entry-group" key={date}>
                <div className="time-entry-group-head"><h2>{heading}</h2><span>{durationLabel(total)}</span></div>
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
