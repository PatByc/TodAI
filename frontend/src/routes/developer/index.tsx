import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Activity, ArrowRight, Database, Gauge, Sparkles } from "lucide-react"
import { useState } from "react"
import { fetchDeveloperMetrics } from "@/api/developer"

export const Route = createFileRoute("/developer/")({ component: DeveloperPage })

const number = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
const duration = (value: number) => value >= 1_000 ? `${(value / 1_000).toFixed(1)}s` : `${Math.round(value)}ms`
const label = (value: string) => value.replaceAll("_", " ")

function DeveloperPage() {
  const [days, setDays] = useState(7)
  const { data, isLoading, error } = useQuery({
    queryKey: ["developer-metrics", days],
    queryFn: () => fetchDeveloperMetrics(days),
    refetchInterval: 30_000,
  })

  if (isLoading) return <div className="developer-state">Reading efficiency signals…</div>
  if (error || !data) return <div className="developer-state developer-state-error">Metrics could not be loaded.</div>

  const summary = data.summary
  const toolSaved = Math.max(0, summary.tool_chars_before - summary.tool_chars_after)
  const maxTokens = Math.max(1, ...data.daily.map((day) => day.input_tokens + day.output_tokens + day.embedding_tokens))
  const embeddedPercent = data.index.total_chunks
    ? Math.round(data.index.embedded_chunks / data.index.total_chunks * 100)
    : 0

  return (
    <div className="developer-page">
      <header className="developer-header">
        <div>
          <span className="developer-kicker"><Activity size={13} /> Developer telemetry</span>
          <h1>Efficiency ledger</h1>
          <p>Content-free measurements for model context, indexing, and database work.</p>
        </div>
        <div className="developer-period" aria-label="Metrics period">
          {[1, 7, 30].map((period) => (
            <button key={period} type="button" className={days === period ? "is-active" : ""} onClick={() => setDays(period)}>
              {period === 1 ? "24h" : `${period}d`}
            </button>
          ))}
        </div>
      </header>

      <section className="developer-flow" aria-label="Efficiency pipeline">
        <div><Sparkles size={16} /><span>Context</span><strong>{number.format(summary.input_tokens)} in</strong></div>
        <ArrowRight size={15} aria-hidden="true" />
        <div><Gauge size={16} /><span>Model</span><strong>{number.format(summary.output_tokens)} out</strong></div>
        <ArrowRight size={15} aria-hidden="true" />
        <div><Database size={16} /><span>Database</span><strong>{number.format(summary.db_queries)} queries</strong></div>
      </section>

      <section className="developer-cards" aria-label="Summary">
        <article><span>Operations</span><strong>{number.format(summary.operations)}</strong><small>{summary.success_rate}% successful</small></article>
        <article><span>Response time</span><strong>{duration(summary.average_duration_ms)}</strong><small>p95 {duration(summary.p95_duration_ms)}</small></article>
        <article><span>Tokens saved</span><strong>{number.format(summary.compression_saved_tokens)}</strong><small>accepted context savings</small></article>
        <article><span>Tool output</span><strong>{number.format(toolSaved)}</strong><small>characters removed</small></article>
        <article><span>Embeddings reused</span><strong>{number.format(summary.embeddings_reused)}</strong><small>{number.format(summary.embeddings_created)} newly created</small></article>
      </section>

      <div className="developer-grid">
        <section className="developer-panel developer-trend">
          <div className="developer-panel-heading"><h2>Token traffic</h2><span>{days} day window</span></div>
          <div className="developer-bars" aria-label="Daily token volume">
            {data.daily.map((day) => {
              const tokens = day.input_tokens + day.output_tokens + day.embedding_tokens
              return (
                <div key={day.date} title={`${day.date}: ${tokens} tokens`}>
                  <i style={{ height: `${Math.max(3, tokens / maxTokens * 100)}%` }} />
                  <span>{day.date.slice(5)}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="developer-panel developer-index">
          <div className="developer-panel-heading"><h2>Index health</h2><span>{embeddedPercent}% embedded</span></div>
          <div className="developer-index-total"><strong>{number.format(data.index.total_chunks)}</strong><span>search chunks</span></div>
          <div className="developer-index-meter"><i style={{ width: `${embeddedPercent}%` }} /></div>
          <dl>
            {Object.entries(data.index.by_entity_type).map(([type, count]) => (
              <div key={type}><dt>{label(type)}</dt><dd>{count}</dd></div>
            ))}
          </dl>
        </section>
      </div>

      <section className="developer-panel developer-recent">
        <div className="developer-panel-heading"><h2>Recent operations</h2><span>Payload content is never stored</span></div>
        <div className="developer-table-wrap">
          <table>
            <thead><tr><th>Operation</th><th>Status</th><th>Duration</th><th>Tokens</th><th>DB</th><th>Embeddings</th><th>Started</th></tr></thead>
            <tbody>
              {data.recent.map((item) => (
                <tr key={item.id}>
                  <td>{label(item.operation)}</td>
                  <td><span className={`developer-status ${item.success ? "is-good" : "is-bad"}`}>{item.success ? "ok" : item.error_type ?? "failed"}</span></td>
                  <td>{duration(item.duration_ms)}</td>
                  <td>{number.format(item.input_tokens + item.output_tokens + item.embedding_tokens)}</td>
                  <td>{item.db_queries}</td>
                  <td>{item.embeddings_reused}/{item.embeddings_created}</td>
                  <td>{new Date(item.started_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
              {data.recent.length === 0 && <tr><td colSpan={7} className="developer-empty">No measured AI or indexing operations yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
