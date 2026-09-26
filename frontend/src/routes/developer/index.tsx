import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Activity, ArrowRight, Cloud, Database, Gauge, ReceiptText, Sparkles, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { fetchAPICosts, fetchDeveloperMetrics } from "@/api/developer"

export const Route = createFileRoute("/developer/")({ component: DeveloperPage })

const number = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
const duration = (value: number) => value >= 1_000 ? `${(value / 1_000).toFixed(1)}s` : `${Math.round(value)}ms`
const label = (value: string) => value.replaceAll("_", " ")
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 6 })

type DeveloperSection = "efficiency" | "costs"

function DeveloperPage() {
  const [activeSection, setActiveSection] = useState<DeveloperSection>("efficiency")
  const [days, setDays] = useState(7)
  const metrics = useQuery({
    queryKey: ["developer-metrics", days],
    queryFn: () => fetchDeveloperMetrics(days),
    refetchInterval: 30_000,
    enabled: activeSection === "efficiency",
  })
  const costs = useQuery({
    queryKey: ["developer-costs", days],
    queryFn: () => fetchAPICosts(days),
    refetchInterval: 30_000,
    enabled: activeSection === "costs",
  })

  return (
    <div className="developer-page">
      <h1 className="developer-page-title">Developer</h1>

      <div className="developer-layout">
        <nav className="developer-menu" aria-label="Developer sections">
          <button
            type="button"
            className={activeSection === "efficiency" ? "is-active" : ""}
            aria-current={activeSection === "efficiency" ? "page" : undefined}
            onClick={() => setActiveSection("efficiency")}
          >
            <Activity size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>Efficiency</span>
          </button>
          <button
            type="button"
            className={activeSection === "costs" ? "is-active" : ""}
            aria-current={activeSection === "costs" ? "page" : undefined}
            onClick={() => setActiveSection("costs")}
          >
            <ReceiptText size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>API costs</span>
          </button>
        </nav>

        <section className="developer-workspace" aria-label="Developer tool">
          {activeSection === "efficiency" ? (
            metrics.isLoading ? (
              <div className="developer-state">Reading efficiency signals…</div>
            ) : metrics.error || !metrics.data ? (
              <div className="developer-state developer-state-error">Metrics could not be loaded.</div>
            ) : (
              <EfficiencyLedger data={metrics.data} days={days} onDaysChange={setDays} />
            )
          ) : costs.isLoading ? (
            <div className="developer-state">Reading cloud request costs…</div>
          ) : costs.error || !costs.data ? (
            <div className="developer-state developer-state-error">API costs could not be loaded.</div>
          ) : (
            <APICostLedger data={costs.data} days={days} onDaysChange={setDays} />
          )}
        </section>
      </div>
    </div>
  )
}

function APICostLedger({
  data,
  days,
  onDaysChange,
}: {
  data: Awaited<ReturnType<typeof fetchAPICosts>>
  days: number
  onDaysChange: (days: number) => void
}) {
  const maximumDailyCost = Math.max(0.000001, ...data.daily.map((day) => day.estimated_cost_usd))
  const uncachedInput = Math.max(0, data.summary.input_tokens - data.summary.cached_input_tokens)

  return (
    <div className="developer-ledger developer-cost-ledger">
      <header className="developer-header">
        <div>
          <span className="developer-kicker"><Cloud size={13} /> Cloud usage</span>
          <h1>API costs</h1>
          <p>Estimated spend for Tod and search requests, recorded without prompts or response content.</p>
        </div>
        <PeriodSwitch days={days} onChange={onDaysChange} />
      </header>

      <section className="developer-cost-summary" aria-label="API cost summary">
        <div className="developer-cost-total">
          <span>Estimated cost</span>
          <strong>{usd.format(data.summary.estimated_cost_usd)}</strong>
          <small>USD · rates captured at request time</small>
        </div>
        <dl>
          <div><dt>Requests</dt><dd>{number.format(data.summary.requests)}</dd></div>
          <div><dt>Input</dt><dd>{number.format(uncachedInput)}</dd><small>uncached tokens</small></div>
          <div><dt>Cached</dt><dd>{number.format(data.summary.cached_input_tokens)}</dd><small>input tokens</small></div>
          <div><dt>Output</dt><dd>{number.format(data.summary.output_tokens)}</dd><small>tokens</small></div>
        </dl>
      </section>

      {data.summary.unpriced_requests > 0 && (
        <div className="developer-cost-warning" role="status">
          <TriangleAlert size={14} aria-hidden="true" />
          <span><strong>{data.summary.unpriced_requests} unpriced request{data.summary.unpriced_requests === 1 ? "" : "s"}</strong> remain visible below but are not included in the estimate.</span>
        </div>
      )}

      {data.summary.requests === 0 ? (
        <div className="developer-cost-empty">
          <ReceiptText size={18} aria-hidden="true" />
          <strong>No cloud requests in this period</strong>
          <span>New Tod completions and embedding calls will be recorded here automatically.</span>
        </div>
      ) : (
        <>
          <div className="developer-grid developer-cost-grid">
            <section className="developer-panel developer-cost-trend">
              <div className="developer-panel-heading"><h2>Daily estimate</h2><span>{days} day window</span></div>
              <div className="developer-cost-bars" aria-label="Daily estimated API cost">
                {data.daily.map((day) => (
                  <div key={day.date} title={`${day.date}: ${usd.format(day.estimated_cost_usd)} across ${day.requests} requests`}>
                    <span>{day.estimated_cost_usd > 0 ? usd.format(day.estimated_cost_usd) : ""}</span>
                    <i style={{ height: `${day.estimated_cost_usd > 0 ? Math.max(4, day.estimated_cost_usd / maximumDailyCost * 100) : 0}%` }} />
                    <small>{day.date.slice(5)}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="developer-panel developer-cost-models">
              <div className="developer-panel-heading"><h2>Provider and model</h2><span>{data.by_model.length} model route{data.by_model.length === 1 ? "" : "s"}</span></div>
              <div className="developer-cost-model-list">
                {data.by_model.map((item) => (
                  <div key={`${item.provider}:${item.model}:${item.request_kind}`}>
                    <span className="developer-provider-mark">{item.provider.slice(0, 1).toUpperCase()}</span>
                    <p><strong>{item.model}</strong><small>{item.provider} · {item.request_kind} · {item.requests} request{item.requests === 1 ? "" : "s"}</small></p>
                    <b>{item.unpriced_requests === item.requests ? "Unpriced" : usd.format(item.estimated_cost_usd)}</b>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="developer-panel developer-recent developer-cost-recent">
            <div className="developer-panel-heading"><h2>Recent cloud requests</h2><span>Token counts and estimates only</span></div>
            <div className="developer-table-wrap">
              <table>
                <thead><tr><th>Provider / model</th><th>Use</th><th>Input</th><th>Cached</th><th>Output</th><th>Estimate</th><th>Time</th></tr></thead>
                <tbody>
                  {data.recent.map((item) => (
                    <tr key={item.id} title={item.provider_request_id ? `Provider request ${item.provider_request_id}` : undefined}>
                      <td><strong>{item.model}</strong><small>{item.provider}</small></td>
                      <td>{label(item.operation)}<small>{item.request_kind}</small></td>
                      <td>{number.format(Math.max(0, item.input_tokens - item.cached_input_tokens))}</td>
                      <td>{number.format(item.cached_input_tokens)}</td>
                      <td>{number.format(item.output_tokens)}</td>
                      <td>{item.estimated_cost_usd === null ? <span className="developer-cost-unpriced">Unpriced</span> : usd.format(item.estimated_cost_usd)}</td>
                      <td>{new Date(item.occurred_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function PeriodSwitch({ days, onChange }: { days: number; onChange: (days: number) => void }) {
  return (
    <div className="developer-period" aria-label="Reporting period">
      {[1, 7, 30].map((period) => (
        <button key={period} type="button" className={days === period ? "is-active" : ""} onClick={() => onChange(period)}>
          {period === 1 ? "24h" : `${period}d`}
        </button>
      ))}
    </div>
  )
}

function EfficiencyLedger({
  data,
  days,
  onDaysChange,
}: {
  data: Awaited<ReturnType<typeof fetchDeveloperMetrics>>
  days: number
  onDaysChange: (days: number) => void
}) {
  const summary = data.summary
  const toolSaved = Math.max(0, summary.tool_chars_before - summary.tool_chars_after)
  const maxTokens = Math.max(1, ...data.daily.map((day) => day.input_tokens + day.output_tokens + day.embedding_tokens))
  const embeddedPercent = data.index.total_chunks
    ? Math.round(data.index.embedded_chunks / data.index.total_chunks * 100)
    : 0

  return (
    <div className="developer-ledger">
      <header className="developer-header">
        <div>
          <span className="developer-kicker"><Activity size={13} /> Live telemetry</span>
          <h1>Efficiency ledger</h1>
          <p>Content-free measurements for model context, indexing, and database work.</p>
        </div>
        <PeriodSwitch days={days} onChange={onDaysChange} />
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
