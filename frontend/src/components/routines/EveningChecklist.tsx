import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Check, Flame, MoonStar } from "lucide-react"
import { useEffect, useState } from "react"
import { useEveningSummary, useSaveEveningReflection, useSetRoutineCompletion } from "@/hooks/usePlanning"

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function shortTime(value: string) {
  return value.slice(0, 5)
}

export function EveningChecklist({ momentum = false, showMotto = true }: { momentum?: boolean; showMotto?: boolean }) {
  const today = localDateValue()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  const { data: evening, isLoading } = useEveningSummary(today, timezone)
  const completion = useSetRoutineCompletion()
  const saveReflection = useSaveEveningReflection()
  const [score, setScore] = useState<number | null>(null)
  const [journal, setJournal] = useState("")
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!evening) return
    setScore(evening.score)
    setJournal(evening.journal)
  }, [evening])

  if (isLoading) return <section className="morning-card evening-card is-loading"><p>Preparing this evening…</p></section>
  if (!evening) return null
  const windowClosed = evening.phase === "closed"
  const won = evening.scheduled_count > 0 && evening.completed_count === evening.scheduled_count
  const status = won
    ? "Evening complete"
    : windowClosed
      ? `Window ended · ${evening.scheduled_count - evening.completed_count} to log`
      : evening.phase === "early"
        ? `Early close · window ${shortTime(evening.start_time)}–${shortTime(evening.end_time)}`
        : `Open until ${shortTime(evening.end_time)}`
  const reflectionChanged = score !== evening.score || journal !== evening.journal

  const toggle = (id: number, completed: boolean) => {
    setError("")
    completion.mutate(
      { id, data: { completed_on: today, completed: !completed, timezone } },
      { onError: (reason) => setError(reason instanceof Error ? reason.message : "Could not update this evening.") },
    )
  }

  const save = () => {
    setError("")
    setSaved(false)
    saveReflection.mutate(
      { reflected_on: today, score, journal, timezone },
      {
        onSuccess: () => setSaved(true),
        onError: (reason) => setError(reason instanceof Error ? reason.message : "Could not save this reflection."),
      },
    )
  }

  return <section className={`morning-card evening-card is-${evening.phase}${won ? " is-won" : ""}`} aria-labelledby="evening-card-title">
    <header className="morning-card-head">
      <div className="morning-symbol" aria-hidden="true"><MoonStar size={19} /></div>
      <div><span>Evening · {status}</span><h2 id="evening-card-title">{showMotto ? "Sum up the day." : "Tonight’s close."}</h2>{showMotto && <p>Prepare to smash the next one.</p>}</div>
      <div className="morning-score"><strong>{evening.completed_count}<small>/{evening.scheduled_count}</small></strong><span>done</span></div>
    </header>
    <div className="morning-progress" aria-label={`${evening.completed_count} of ${evening.scheduled_count} completed`}><i style={{ width: `${evening.scheduled_count ? evening.completed_count / evening.scheduled_count * 100 : 0}%` }} /></div>
    {evening.items.length === 0 ? <div className="morning-empty"><p>No Evening routines are scheduled today.</p><Link to="/routines">Set up your evening <ArrowUpRight size={13} /></Link></div> : <div className="morning-checklist">
      {evening.items.map((item, index) => <button type="button" key={item.id} className={item.completed ? "is-complete" : ""} disabled={completion.isPending} onClick={() => toggle(item.id, item.completed)}>
        <span className="morning-index">{String(index + 1).padStart(2, "0")}</span><i>{item.completed && <Check size={14} />}</i><span><strong>{item.title}</strong>{item.description && <small>{item.description}</small>}</span>
      </button>)}
    </div>}
    <div className="evening-reflection">
      <div className="evening-reflection-head"><div><strong>Close the day</strong><span>How did today feel?</span></div><div className="evening-score-picker" aria-label="Day score">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={score === value ? "is-selected" : ""} aria-label={`Score today ${value} out of 5`} aria-pressed={score === value} onClick={() => { setScore(value); setSaved(false) }}>{value}</button>)}</div></div>
      <textarea value={journal} maxLength={5000} placeholder="What mattered today? What will make tomorrow easier?" aria-label="Evening reflection" onChange={(event) => { setJournal(event.target.value); setSaved(false) }} />
      <div className="evening-reflection-actions"><span>{saved ? "Reflection saved." : reflectionChanged ? "Unsaved reflection" : evening.journal || evening.score ? "Saved for today" : "Optional"}</span><button type="button" disabled={saveReflection.isPending || !reflectionChanged} onClick={save}>{saveReflection.isPending ? "Saving…" : "Save reflection"}</button></div>
    </div>
    {error && <p className="morning-error" role="alert">{error}</p>}
    {momentum ? <div className="morning-momentum">
      <div className="morning-streak"><Flame size={15} /><strong>{evening.streak}</strong><span>evening streak</span></div>
      <ol aria-label="Last seven evenings">{evening.days.map((day) => <li key={day.date} className={day.neutral ? "is-neutral" : day.success ? "is-success" : day.date === today ? "is-current" : "is-missed"} title={`${day.date}: ${day.completed_count}/${day.scheduled_count}`}><i>{day.success && <Check size={10} />}</i><span>{new Intl.DateTimeFormat("en", { weekday: "narrow" }).format(new Date(`${day.date}T12:00:00`))}</span></li>)}</ol>
    </div> : <footer><Link to="/routines">Evening routines <ArrowUpRight size={13} /></Link></footer>}
  </section>
}
