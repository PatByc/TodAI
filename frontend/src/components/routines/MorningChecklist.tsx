import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Check, Flame, Sunrise } from "lucide-react"
import { useState } from "react"
import { useMorningSummary, useSetRoutineCompletion } from "@/hooks/usePlanning"

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function shortTime(value: string) {
  return value.slice(0, 5)
}

export function MorningChecklist({ momentum = false, showMotto = true }: { momentum?: boolean; showMotto?: boolean }) {
  const today = localDateValue()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  const { data: morning, isLoading } = useMorningSummary(today, timezone)
  const completion = useSetRoutineCompletion()
  const [error, setError] = useState("")

  if (isLoading) return <section className="morning-card is-loading"><p>Preparing this morning…</p></section>
  if (!morning) return null
  const windowClosed = morning.phase === "closed"
  const won = morning.scheduled_count > 0 && morning.completed_count === morning.scheduled_count
  const status = won
    ? "Morning won"
    : windowClosed
      ? `Window ended · ${morning.scheduled_count - morning.completed_count} to log`
      : morning.phase === "early"
        ? `Early start · window ${shortTime(morning.start_time)}–${shortTime(morning.end_time)}`
        : `Open until ${shortTime(morning.end_time)}`

  const toggle = (id: number, completed: boolean) => {
    setError("")
    completion.mutate(
      { id, data: { completed_on: today, completed: !completed, timezone } },
      { onError: (reason) => setError(reason instanceof Error ? reason.message : "Could not update this morning.") },
    )
  }

  return <section className={`morning-card is-${morning.phase}${won ? " is-won" : ""}`} aria-labelledby="morning-card-title">
    <header className="morning-card-head">
      <div className="morning-symbol" aria-hidden="true"><Sunrise size={20} /></div>
      <div><span>Morning · {status}</span><h2 id="morning-card-title">{showMotto ? "Start with small wins." : "Today’s morning."}</h2>{showMotto && <p>Carry the momentum into the day.</p>}</div>
      <div className="morning-score"><strong>{morning.completed_count}<small>/{morning.scheduled_count}</small></strong><span>done</span></div>
    </header>
    <div className="morning-progress" aria-label={`${morning.completed_count} of ${morning.scheduled_count} completed`}><i style={{ width: `${morning.scheduled_count ? morning.completed_count / morning.scheduled_count * 100 : 0}%` }} /></div>
    {morning.items.length === 0 ? <div className="morning-empty"><p>No Morning routines are scheduled today.</p><Link to="/routines">Set up your morning <ArrowUpRight size={13} /></Link></div> : <div className="morning-checklist">
      {morning.items.map((item, index) => <button type="button" key={item.id} className={item.completed ? "is-complete" : ""} disabled={completion.isPending} onClick={() => toggle(item.id, item.completed)}>
        <span className="morning-index">{String(index + 1).padStart(2, "0")}</span><i>{item.completed && <Check size={14} />}</i><span><strong>{item.title}</strong>{item.description && <small>{item.description}</small>}</span>
      </button>)}
    </div>}
    {error && <p className="morning-error" role="alert">{error}</p>}
    {momentum ? <div className="morning-momentum">
      <div className="morning-streak"><Flame size={15} /><strong>{morning.streak}</strong><span>morning streak</span></div>
      <ol aria-label="Last seven mornings">{morning.days.map((day) => <li key={day.date} className={day.neutral ? "is-neutral" : day.success ? "is-success" : day.date === today ? "is-current" : "is-missed"} title={`${day.date}: ${day.completed_count}/${day.scheduled_count}`}><i>{day.success && <Check size={10} />}</i><span>{new Intl.DateTimeFormat("en", { weekday: "narrow" }).format(new Date(`${day.date}T12:00:00`))}</span></li>)}</ol>
    </div> : <footer><Link to="/routines">Morning routines <ArrowUpRight size={13} /></Link></footer>}
  </section>
}
