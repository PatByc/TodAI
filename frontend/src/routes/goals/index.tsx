import { createFileRoute } from "@tanstack/react-router"
import { Check, Clock3, Hash, Pencil, Plus, Power, Trash2, X } from "lucide-react"
import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { SelectDropdown } from "@/components/ui/SelectDropdown"
import {
  useCreateMetricGoal,
  useCreateTimeGoal,
  useDeleteMetricGoal,
  useDeleteTimeGoal,
  useMetricGoals,
  useRecordMetricProgress,
  useTimeGoals,
  useUpdateMetricGoal,
  useUpdateTimeGoal,
} from "@/hooks/usePlanning"
import { useTimeEntries, useTimeStreams } from "@/hooks/useTimeConfiguration"
import { durationLabel, localDateValue, parseServerTime } from "@/lib/time"
import type { GoalPeriod, MetricGoal, MetricGoalDirection, TimeGoal } from "@/types/entities"

export const Route = createFileRoute("/goals/")({ component: GoalsPage })

const PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

function periodBounds(period: GoalPeriod, now = new Date()) {
  if (period === "daily") return [new Date(now.getFullYear(), now.getMonth(), now.getDate()), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)]
  if (period === "weekly") {
    const offset = (now.getDay() + 6) % 7
    return [new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset), new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset + 7)]
  }
  return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1)]
}

function numberLabel(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
}

function GoalForm({ timeGoal, metricGoal, initialKind, onClose }: { timeGoal?: TimeGoal; metricGoal?: MetricGoal; initialKind?: "time" | "metric"; onClose: () => void }) {
  const editing = Boolean(timeGoal || metricGoal)
  const { data: streams = [] } = useTimeStreams()
  const [kind, setKind] = useState<"time" | "metric">(metricGoal || initialKind === "metric" ? "metric" : "time")
  const [title, setTitle] = useState(timeGoal?.title ?? metricGoal?.title ?? "")
  const [period, setPeriod] = useState<GoalPeriod>(timeGoal?.period ?? metricGoal?.period ?? "weekly")
  const [hours, setHours] = useState(timeGoal ? String(timeGoal.target_seconds / 3600) : "10")
  const [streamId, setStreamId] = useState(timeGoal?.stream_id ? String(timeGoal.stream_id) : "all")
  const [target, setTarget] = useState(metricGoal ? String(metricGoal.target_value) : "50")
  const [direction, setDirection] = useState<MetricGoalDirection>(metricGoal?.direction ?? "at_least")
  const [error, setError] = useState("")
  const createTime = useCreateTimeGoal()
  const updateTime = useUpdateTimeGoal()
  const createMetric = useCreateMetricGoal()
  const updateMetric = useUpdateMetricGoal()
  const pending = createTime.isPending || updateTime.isPending || createMetric.isPending || updateMetric.isPending

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return setError("Add a name for this goal.")
    try {
      if (kind === "time") {
        const targetSeconds = Math.round(Number(hours) * 3600)
        if (!Number.isFinite(targetSeconds) || targetSeconds <= 0) return setError("Set a time target greater than zero.")
        const data = { title: title.trim(), period, target_seconds: targetSeconds, stream_id: streamId === "all" ? undefined : Number(streamId) }
        if (timeGoal) await updateTime.mutateAsync({ id: timeGoal.id, data: { ...data, stream_id: data.stream_id ?? null } })
        else await createTime.mutateAsync(data)
      } else {
        const targetValue = Number(target)
        if (!Number.isFinite(targetValue) || targetValue <= 0) return setError("Set a number greater than zero.")
        const data = { title: title.trim(), period, target_value: targetValue, direction }
        if (metricGoal) await updateMetric.mutateAsync({ id: metricGoal.id, data })
        else await createMetric.mutateAsync(data)
      }
      onClose()
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Could not save this goal.")
    }
  }

  return <form className="plan-editor goal-editor" onSubmit={(event) => void submit(event)}>
    <div className="plan-editor-head"><div><h2>{editing ? "Edit goal" : "New goal"}</h2><p>{kind === "time" ? "Progress comes from time you track." : "Record progress as you make it."}</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={15} /></button></div>
    <div className={`plan-editor-fields plan-goal-fields${editing ? "" : " has-type"}`}>
      {!editing && <div className="goal-field-type"><span>Type</span><SelectDropdown value={kind} ariaLabel="Goal type" options={[{ value: "time", label: "Time" }, { value: "metric", label: "Number" }]} onChange={(value) => { setKind(value as "time" | "metric"); setError("") }} /></div>}
      <label className="goal-field-title"><span>Goal</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "time" ? "Deep work" : "Daily push-ups"} autoFocus /></label>
      <div className="goal-field-period"><span>Period</span><SelectDropdown value={period} ariaLabel="Goal period" options={PERIOD_OPTIONS} onChange={(value) => setPeriod(value as GoalPeriod)} /></div>
      {kind === "time" ? <><label className="goal-field-target"><span>Hours</span><input type="number" min="0.25" max="8760" step="0.25" value={hours} onChange={(event) => setHours(event.target.value)} /></label><div className="goal-field-scope"><span>Stream</span><SelectDropdown value={streamId} ariaLabel="Goal stream" options={[{ value: "all", label: "All tracked time" }, ...streams.filter((stream) => stream.is_active || stream.id === timeGoal?.stream_id).map((stream) => ({ value: String(stream.id), label: stream.name }))]} onChange={setStreamId} /></div></> : <><label className="goal-field-target"><span>Target</span><input type="number" min="0.01" step="any" value={target} onChange={(event) => setTarget(event.target.value)} /></label><div className="goal-field-scope"><span>Direction</span><SelectDropdown value={direction} ariaLabel="Goal direction" options={[{ value: "at_least", label: "At least" }, { value: "at_most", label: "At most" }]} onChange={(value) => setDirection(value as MetricGoalDirection)} /></div></>}
    </div>
    <div className="plan-editor-actions">{error && <p role="alert">{error}</p>}<button type="button" onClick={onClose}>Cancel</button><button className="is-primary" type="submit" disabled={pending}><Check size={14} /> {pending ? "Saving…" : "Save goal"}</button></div>
  </form>
}

function MetricGoalRow({ goal, onEdit }: { goal: MetricGoal; onEdit: () => void }) {
  const update = useUpdateMetricGoal()
  const remove = useDeleteMetricGoal()
  const record = useRecordMetricProgress()
  const [amount, setAmount] = useState("")
  const [error, setError] = useState("")
  const overLimit = goal.direction === "at_most" && goal.current_value > goal.target_value
  const percent = Math.min(100, goal.current_value / goal.target_value * 100)

  const submitProgress = async (event: FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return setError("Enter a positive number.")
    try {
      await record.mutateAsync({ id: goal.id, data: { value, recorded_on: localDateValue() } })
      setAmount("")
      setError("")
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Could not record progress.")
    }
  }

  return <article className={`${goal.is_active ? "" : "is-inactive"}${overLimit ? " is-over-limit" : ""}`}>
    <div className="plan-goal-copy"><span><Hash size={13} /> {goal.period}</span><strong>{goal.title}</strong><small>{goal.direction === "at_least" ? "At least" : "At most"} {numberLabel(goal.target_value)}</small></div>
    <div className="plan-goal-progress"><div><span style={{ width: `${percent}%` }} /></div><p><strong>{numberLabel(goal.current_value)}</strong><span>of {numberLabel(goal.target_value)}</span></p></div>
    <form className="metric-progress-add" onSubmit={(event) => void submitProgress(event)}><input type="number" min="0.01" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Add" aria-label={`Add progress to ${goal.title}`} title={error || "Add progress for today"} /><button type="submit" disabled={record.isPending} aria-label={`Record progress for ${goal.title}`}><Plus size={12} /></button></form>
    <div className="plan-row-actions"><button type="button" onClick={() => update.mutate({ id: goal.id, data: { is_active: !goal.is_active } })} aria-label={`${goal.is_active ? "Pause" : "Activate"} ${goal.title}`}><Power size={13} /></button><button type="button" onClick={onEdit} aria-label={`Edit ${goal.title}`}><Pencil size={13} /></button><button type="button" onClick={() => remove.mutate(goal.id)} aria-label={`Delete ${goal.title}`}><Trash2 size={13} /></button></div>
  </article>
}

function GoalsPage() {
  const today = localDateValue()
  const { data: goals = [], isLoading } = useTimeGoals()
  const { data: metricGoals = [], isLoading: metricLoading } = useMetricGoals(true, today)
  const { data: streams = [] } = useTimeStreams()
  const update = useUpdateTimeGoal()
  const remove = useDeleteTimeGoal()
  const [editor, setEditor] = useState<{ timeGoal?: TimeGoal; metricGoal?: MetricGoal; kind?: "time" | "metric" } | null>(null)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const { data: monthEntries = [] } = useTimeEntries({ limit: 500, from_at: monthStart.toISOString(), to_at: monthEnd.toISOString() })
  const streamById = new Map(streams.map((stream) => [stream.id, stream]))
  const progressByGoal = useMemo(() => new Map(goals.map((goal) => {
    const [start, end] = periodBounds(goal.period, now)
    const seconds = monthEntries.filter((entry) => {
      const entryStart = parseServerTime(entry.started_at)
      return entryStart >= start && entryStart < end && (!goal.stream_id || entry.stream_id === goal.stream_id)
    }).reduce((sum, entry) => sum + (entry.duration_seconds ?? Math.max(0, (Date.now() - parseServerTime(entry.started_at).getTime()) / 1000)), 0)
    return [goal.id, seconds]
  })), [goals, monthEntries])

  return <div className="plan-page progress-page">
    <header className="plan-page-head"><div><h1>Goals</h1><p>Measure the commitments that matter, in time or numbers.</p></div><div className="plan-head-actions"><button type="button" onClick={() => setEditor({})}><Plus size={14} /> New goal</button></div></header>
    {editor && <GoalForm timeGoal={editor.timeGoal} metricGoal={editor.metricGoal} initialKind={editor.kind} onClose={() => setEditor(null)} />}
    <section aria-labelledby="time-goals-title">
      <div className="plan-section-head"><div><h2 id="time-goals-title">Time goals</h2><span>Measured from the timer</span></div></div>
      {isLoading ? <p className="plan-state">Loading goals…</p> : goals.length === 0 ? <button type="button" className="plan-empty" onClick={() => setEditor({ kind: "time" })}><strong>No time goals yet</strong><span>Set a target calculated from tracked time.</span></button> : <div className="plan-goal-list">{goals.map((goal) => {
        const progress = progressByGoal.get(goal.id) ?? 0
        const percent = Math.min(100, progress / goal.target_seconds * 100)
        return <article key={goal.id} className={goal.is_active ? "" : "is-inactive"}><div className="plan-goal-copy"><span><Clock3 size={13} /> {goal.period}</span><strong>{goal.title}</strong><small>{goal.stream_id ? streamById.get(goal.stream_id)?.name ?? "Removed stream" : "All tracked time"}</small></div><div className="plan-goal-progress"><div><span style={{ width: `${percent}%` }} /></div><p><strong>{durationLabel(Math.round(progress))}</strong><span>of {durationLabel(goal.target_seconds)}</span></p></div><div className="plan-row-actions"><button type="button" onClick={() => update.mutate({ id: goal.id, data: { is_active: !goal.is_active } })} aria-label={`${goal.is_active ? "Pause" : "Activate"} ${goal.title}`}><Power size={13} /></button><button type="button" onClick={() => setEditor({ timeGoal: goal })} aria-label={`Edit ${goal.title}`}><Pencil size={13} /></button><button type="button" onClick={() => remove.mutate(goal.id)} aria-label={`Delete ${goal.title}`}><Trash2 size={13} /></button></div></article>
      })}</div>}
    </section>
    <section className="metric-goals-section" aria-labelledby="metric-goals-title">
      <div className="plan-section-head"><div><h2 id="metric-goals-title">Number goals</h2><span>Progress you record</span></div></div>
      {metricLoading ? <p className="plan-state">Loading goals…</p> : metricGoals.length === 0 ? <button type="button" className="plan-empty" onClick={() => setEditor({ kind: "metric" })}><strong>No number goals yet</strong><span>Track repetitions, distance, earnings, or any other number.</span></button> : <div className="plan-goal-list metric-goal-list">{metricGoals.map((goal) => <MetricGoalRow key={goal.id} goal={goal} onEdit={() => setEditor({ metricGoal: goal })} />)}</div>}
    </section>
  </div>
}
