import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router"
import { ArrowUp, BookOpenText, Check, ChevronDown, MessageCircleMore, Mic, MicOff, Pin, ShieldCheck, Zap } from "lucide-react"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { approveAgent, getAgentStatus, rejectAgent, startAgentRun, streamAgentRun, type AgentDecision, type AgentEvent, type AgentPlan, type AgentTurn } from "@/api/agent"
import { useAskStore } from "@/stores/ask"
import { useLocalDictation } from "@/hooks/useLocalDictation"
import { TodLogo } from "@/components/TodLogo"
import { AskCommandPalette } from "@/components/ask/AskCommandPalette"
import { matchCapabilities, parseCapabilityCommand } from "@/lib/capabilities"
import type { Capability } from "@/lib/capabilities"

export const Route = createFileRoute("/ask/")({
  component: AskLegacyRoute,
})

function AskLegacyRoute() {
  const navigate = useNavigate()
  const openAsk = useAskStore((state) => state.open)
  useEffect(() => {
    openAsk()
    void navigate({ to: "/", replace: true })
  }, [navigate, openAsk])
  return null
}

interface ConversationEntry {
  question: string
  runId?: string
  activity?: AgentEvent[]
  activityOpen?: boolean
  plan?: AgentPlan
  decision?: AgentDecision
  decisionError?: string
  error?: string
}

const conversationKey = "todai-agent-conversation"

function savedConversation(): ConversationEntry[] {
  try {
    const stored = JSON.parse(sessionStorage.getItem(conversationKey) ?? "[]") as unknown
    if (!Array.isArray(stored)) return []
    return (stored.slice(-10) as ConversationEntry[]).map((entry) =>
      entry.plan || entry.error
        ? entry
        : { ...entry, error: "This answer was interrupted. Please ask again." },
    )
  } catch {
    return []
  }
}

function LiveActivityTicker({ text }: { text: string }) {
  const previousText = useRef(text)
  const [transition, setTransition] = useState({ current: text, previous: null as string | null, version: 0 })

  useEffect(() => {
    if (text === previousText.current) return
    const previous = previousText.current
    previousText.current = text
    setTransition((state) => ({ current: text, previous, version: state.version + 1 }))
    const timer = window.setTimeout(() => {
      setTransition((state) => state.current === text ? { ...state, previous: null } : state)
    }, 280)
    return () => window.clearTimeout(timer)
  }, [text])

  return (
    <span className="ask-activity-ticker" aria-live="polite">
      {transition.previous && <span className="ask-activity-ticker-out">{transition.previous}</span>}
      <span className="ask-activity-ticker-in" key={transition.version}>{transition.current}</span>
    </span>
  )
}

function ActivityTrace({ events, open, live, onToggle }: { events: AgentEvent[]; open: boolean; live: boolean; onToggle: () => void }) {
  const hasToolActivity = events.some((event) => event.event.startsWith("tool_") || event.event === "tools_selected" || event.event.startsWith("batch_"))
  const visible = (live || hasToolActivity ? events : [])
    .filter((event) => event.data.message && !["run_completed", "proposal_ready"].includes(event.event))
    .reduce<AgentEvent[]>((steps, event) => {
      if (event.event === "tool_completed" || event.event === "tool_progress") {
        const prior = steps.findLastIndex((step) => step.data.tool === event.data.tool && step.event.startsWith("tool_"))
        if (prior >= 0) return [...steps.slice(0, prior), event, ...steps.slice(prior + 1)]
      }
      return [...steps, event]
    }, [])
  const latest = visible.at(-1)?.data.message as string | undefined
  const elapsedByRun = new Map<string, number>()
  for (const event of events) {
    const runId = String(event.data.run_id ?? "run")
    const elapsed = Number(event.data.elapsed_ms ?? 0)
    elapsedByRun.set(runId, Math.max(elapsedByRun.get(runId) ?? 0, elapsed))
  }
  const elapsedMs = [...elapsedByRun.values()].reduce((total, elapsed) => total + elapsed, 0)
  const elapsedSeconds = Math.max(1, Math.round(elapsedMs / 1000))
  const duration = elapsedSeconds < 60
    ? `${elapsedSeconds}s`
    : `${Math.floor(elapsedSeconds / 60)}m ${String(elapsedSeconds % 60).padStart(2, "0")}s`
  if (visible.length === 0 && !live) return null
  return (
    <div className={`ask-activity${live ? " ask-activity-live" : ""}`}>
      <button type="button" className="ask-activity-toggle" onClick={onToggle} aria-expanded={open}>
        <span className="ask-activity-dot" />
        {live
          ? <LiveActivityTicker text={latest ?? "Tod is thinking…"} />
          : <span>{visible.length} activity steps · {duration}</span>}
        <ChevronDown size={13} className={open ? "ask-activity-chevron-open" : ""} />
      </button>
      {open && <ol className="ask-activity-list">
        {visible.map((event, index) => <li key={`${event.sequence}-${event.event}`} className={live && index === visible.length - 1 ? "ask-activity-current" : ""}>
          {String(event.data.message)}
          {Boolean(event.data.outcome) && <small>{String(event.data.outcome)}</small>}
        </li>)}
      </ol>}
    </div>
  )
}

function AgentReview({
  plan, decision, error, busy, onChoice, onRevise,
}: {
  plan: AgentPlan
  decision?: AgentDecision
  error?: string
  busy: boolean
  onChoice: (choice: "approve" | "reject") => void
  onRevise: () => void
}) {
  if (plan.actions.length === 0) return <><div className="agent-no-changes">Answer</div><p className="ask-answer">{plan.message}</p>{plan.sources?.length > 0 && <div className="ask-sources">{plan.sources.map((source) => <a key={`${source.entity_type}-${source.entity_id}`} href={source.url}>[{source.number}] {source.title || `${source.entity_type} #${source.entity_id}`}</a>)}</div>}</>
  return (
    <div className="agent-review">
      <p className="agent-review-intro">{plan.message}</p>
      <div className="agent-review-heading">Proposed changes · {plan.actions.length}</div>
      {plan.actions.map((action, index) => (
        <div className="agent-review-action" key={index}>
          <strong>{action.description}</strong>
          <span>{action.operation} {action.entity_type.replace("_", " ")}{action.entity_id ? ` #${action.entity_id}` : ""}</span>
          {Object.keys(action.fields).length > 0 && (
            <dl>
              {Object.entries(action.fields).map(([field, value]) => (
                <div key={field}><dt>{field.replace("_", " ")}</dt><dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd></div>
              ))}
            </dl>
          )}
        </div>
      ))}
      {!decision && (
        <>
          <p className="agent-review-note">Nothing changes until you approve. The proposal expires after 30 minutes.</p>
          <div className="agent-review-actions">
            <button type="button" className="agent-approve" onClick={() => onChoice("approve")} disabled={busy || !plan.id}>Approve changes</button>
            <button type="button" className="agent-reject" onClick={onRevise} disabled={busy || !plan.id}>Revise</button>
            <button type="button" className="agent-reject" onClick={() => onChoice("reject")} disabled={busy || !plan.id}>Reject</button>
          </div>
        </>
      )}
      {decision && (
        <div className="agent-review-outcome" role="status">
          <strong>{decision.status === "applied" ? "Changes applied" : decision.status === "rejected" ? "Changes rejected" : "Some changes could not be applied"}</strong>
          {decision.results.map((result, index) => (
            <p key={index}>
              {result.success ? "✓" : "!"} {result.description} — {result.detail}
              {result.url && <> <a href={result.url}>Open</a></>}
            </p>
          ))}
        </div>
      )}
      {error && <p className="ask-error" role="alert">{error}</p>}
    </div>
  )
}

export function AskConversation({
  isOpen,
  isPinned,
  onClose,
  onTogglePinned,
}: {
  isOpen: boolean
  isPinned: boolean
  onClose: () => void
  onTogglePinned: () => void
}) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading")
  const [statusReason, setStatusReason] = useState("")
  const [question, setQuestion] = useState("")
  const [conversation, setConversation] = useState<ConversationEntry[]>(savedConversation)
  const [busy, setBusy] = useState(false)
  const [deciding, setDeciding] = useState<number | null>(null)
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const [commandMenuDismissed, setCommandMenuDismissed] = useState(false)
  const [activeCommandIndex, setActiveCommandIndex] = useState(0)
  const setRunning = useAskStore((state) => state.setRunning)
  const approvalMode = useAskStore((state) => state.approvalMode)
  const setApprovalMode = useAskStore((state) => state.setApprovalMode)
  const endRef = useRef<HTMLDivElement>(null)
  const conversationRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const streamsRef = useRef<Map<string, () => void>>(new Map())
  const modeMenuRef = useRef<HTMLDivElement>(null)
  const dictation = useLocalDictation((transcript) => {
    setQuestion((current) => `${current.trimEnd()}${current.trim() ? " " : ""}${transcript}`)
    inputRef.current?.focus()
  })
  const commandMatch = question.match(/^\/([^\s]*)$/)
  const commandOptions = commandMatch && !commandMenuDismissed
    ? matchCapabilities(commandMatch[1], pathname)
    : []
  const commandMenuOpen = commandMatch !== null && !commandMenuDismissed

  useEffect(() => setActiveCommandIndex(0), [question])

  useEffect(() => {
    void getAgentStatus().then((result) => {
      setStatus(result.available ? "ready" : "unavailable")
      setStatusReason(result.reason ?? "")
    }).catch(() => {
      setStatus("unavailable")
      setStatusReason("Could not check Ask Tod. Reload the page and try again.")
    })
  }, [])

  useEffect(() => {
    if (isOpen && conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight
    }
  }, [conversation, busy, isOpen])

  useEffect(() => {
    if (isOpen && status === "ready") inputRef.current?.focus()
  }, [isOpen, status])

  useEffect(() => {
    sessionStorage.setItem(conversationKey, JSON.stringify(conversation.slice(-10)))
  }, [conversation])

  useEffect(() => {
    if (!modeMenuOpen) return
    const closeMenu = (event: PointerEvent) => {
      if (!modeMenuRef.current?.contains(event.target as Node)) setModeMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModeMenuOpen(false)
    }
    document.addEventListener("pointerdown", closeMenu)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeMenu)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [modeMenuOpen])

  useEffect(() => () => {
    for (const closeStream of streamsRef.current.values()) closeStream()
    streamsRef.current.clear()
  }, [])

  const watchRun = (runId: string, index: number, phase: "plan" | "approval") => {
    const close = streamAgentRun(runId, (agentEvent) => {
      const autoCompleted = agentEvent.event === "run_completed" && agentEvent.data.mode === "auto"
      setConversation((entries) => entries.map((entry, position) => {
        if (position !== index) return entry
        const prior = entry.activity ?? []
        const activity = prior.some((item) => item.sequence === agentEvent.sequence && item.event === agentEvent.event)
          ? prior : [...prior, agentEvent]
        if (agentEvent.event === "proposal_ready") {
          return { ...entry, activity, activityOpen: false, plan: agentEvent.data as unknown as AgentPlan }
        }
        if (agentEvent.event === "run_completed") {
          if (phase === "approval") return { ...entry, activity, activityOpen: false, decision: agentEvent.data as unknown as AgentDecision }
          if (autoCompleted) return {
            ...entry,
            activity,
            activityOpen: false,
            plan: agentEvent.data.plan as unknown as AgentPlan,
            decision: agentEvent.data.decision as unknown as AgentDecision,
          }
          return { ...entry, activity, activityOpen: false, plan: agentEvent.data as unknown as AgentPlan }
        }
        if (agentEvent.event === "run_failed") return { ...entry, activity, activityOpen: false, error: String(agentEvent.data.message ?? "Tod could not finish this request.") }
        return { ...entry, activity }
      }))
      if (["approval_required", "run_completed", "run_failed"].includes(agentEvent.event)) {
        streamsRef.current.delete(runId)
        setBusy(false)
        setDeciding(null)
        setRunning(false)
        if ((phase === "approval" || autoCompleted) && agentEvent.event === "run_completed") void queryClient.invalidateQueries()
        inputRef.current?.focus()
      }
    }, () => {
      streamsRef.current.delete(runId)
      setConversation((entries) => entries.map((entry, position) => position === index && !entry.plan
        ? { ...entry, error: "The activity stream disconnected. Please try again.", activityOpen: false } : entry))
      setBusy(false)
      setDeciding(null)
      setRunning(false)
    })
    streamsRef.current.set(runId, close)
  }

  const send = async (event?: FormEvent) => {
    event?.preventDefault()
    const text = question.trim()
    if (!text || busy || deciding !== null || status !== "ready") return
    dictation.stop()

    const invocation = parseCapabilityCommand(text)
    if (invocation?.capability.route && !invocation.argumentsText) {
      setQuestion("")
      void navigate({ to: invocation.capability.route })
      if (!isPinned) onClose()
      return
    }
    const agentRequest = invocation?.capability.prompt
      ? invocation.capability.prompt(invocation.argumentsText)
      : text

    const history: AgentTurn[] = conversation.flatMap((entry) => {
      if (!entry.plan) return []
      const assistantContent = `${entry.plan.message}\nProposed: ${JSON.stringify(entry.plan.actions)}\nHuman decision: ${entry.decision?.status ?? "pending"}`
      return [
        { role: "user" as const, content: entry.question },
        { role: "assistant" as const, content: assistantContent.slice(0, 4000) },
      ]
    }).slice(-12)

    setQuestion("")
    setBusy(true)
    setRunning(true)
    const entryIndex = conversation.length
    setConversation((entries) => [...entries, { question: text, activity: [], activityOpen: false }])
    try {
      const { run_id: runId } = await startAgentRun(agentRequest, history, approvalMode)
      setConversation((entries) => entries.map((entry, index) =>
        index === entryIndex ? { ...entry, runId } : entry,
      ))
      watchRun(runId, entryIndex, "plan")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tod could not answer. Try again."
      setConversation((entries) => entries.map((entry, index) =>
        index === entries.length - 1 ? { ...entry, error: message } : entry,
      ))
      setBusy(false)
      setRunning(false)
      inputRef.current?.focus()
    }
  }

  const selectCommand = (capability: Capability) => {
    setCommandMenuDismissed(true)
    if (capability.route) {
      setQuestion("")
      void navigate({ to: capability.route })
      if (!isPinned) onClose()
      return
    }
    setQuestion(`${capability.command} `)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const decide = async (index: number, id: string, choice: "approve" | "reject") => {
    if (deciding !== null) return false
    let streamStarted = false
    setDeciding(index)
    setRunning(choice === "approve")
    setConversation((entries) => entries.map((entry, position) => position === index ? { ...entry, decisionError: undefined } : entry))
    try {
      if (choice === "approve") {
        const { run_id: runId } = await approveAgent(id)
        setConversation((entries) => entries.map((entry, position) => position === index ? { ...entry, runId, activityOpen: false } : entry))
        watchRun(runId, index, "approval")
        streamStarted = true
        return true
      }
      const decision = await rejectAgent(id)
      setConversation((entries) => entries.map((entry, position) => position === index ? { ...entry, decision } : entry))
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not process this proposal."
      setConversation((entries) => entries.map((entry, position) => position === index ? { ...entry, decisionError: message } : entry))
      return false
    } finally {
      if (!streamStarted) {
        setDeciding(null)
        setRunning(false)
      }
    }
  }

  const revise = async (index: number, id: string) => {
    if (await decide(index, id, "reject")) {
      setQuestion("Please revise your proposal: ")
      inputRef.current?.focus()
    }
  }

  return (
    <div className="ask-page">
      <div className="ask-heading">
        <div className="ask-mark"><TodLogo size={28} /></div>
        <div className="ask-heading-copy">
          <h1>Ask Tod</h1>
          <p>Ask questions or propose changes.</p>
        </div>
        {conversation.length > 0 && (
          <button className="ask-clear" onClick={() => setConversation([])} disabled={busy || deciding !== null} title="Clear conversation" aria-label="Clear conversation">
            Clear
          </button>
        )}
        <button
          className={`ask-pin${isPinned ? " ask-pin-active" : ""}`}
          type="button"
          onClick={onTogglePinned}
          aria-label={isPinned ? "Unpin Ask Tod" : "Pin Ask Tod beside the workspace"}
          aria-pressed={isPinned}
          title={isPinned ? "Unpin from workspace" : "Pin beside workspace"}
        >
          <Pin size={16} strokeWidth={1.8} />
        </button>
        <button className="ask-close" type="button" onClick={onClose} aria-label="Close Ask Tod">
          ×
        </button>
      </div>

      <div className="ask-rule" />

      {status === "unavailable" && (
        <div className="ask-notice" role="status">
          <BookOpenText size={19} />
          <div>
            <strong>Ask Tod needs an AI provider.</strong>
            <p>{statusReason} Search still works offline with Ctrl+K.</p>
          </div>
        </div>
      )}

      {conversation.length === 0 && status === "ready" && (
        <div className="ask-empty">
          <MessageCircleMore size={29} strokeWidth={1.5} />
          <h2>What should Tod help with?</h2>
          <p>{approvalMode === "auto"
            ? "Tod can inspect what you’ve saved and apply validated changes automatically."
            : "Tod can inspect what you’ve saved, answer questions, and prepare changes for your approval."}</p>
          <div className="ask-prompts">
            {["What am I working on?", "Add a task for tomorrow"].map((prompt) => (
              <button key={prompt} onClick={() => { setQuestion(prompt); inputRef.current?.focus() }}>
                {prompt}
              </button>
            ))}
            <button onClick={() => { setQuestion("/"); setCommandMenuDismissed(false); inputRef.current?.focus() }}>
              Browse commands
            </button>
          </div>
        </div>
      )}

      <div className="ask-conversation" ref={conversationRef} aria-live="polite">
        {conversation.map((entry, index) => (
          <div className="ask-exchange" key={`${index}-${entry.question}`}>
            <div className="ask-question">{entry.question}</div>
            <div className="ask-response">
              <span className="ask-response-mark"><TodLogo size={23} /></span>
              <div className="ask-response-body">
                <ActivityTrace
                  events={entry.activity ?? []}
                  open={entry.activityOpen ?? false}
                  live={!entry.plan && !entry.error || deciding === index}
                  onToggle={() => setConversation((entries) => entries.map((item, position) => position === index ? { ...item, activityOpen: !item.activityOpen } : item))}
                />
                {entry.plan && (
                  <AgentReview
                    plan={entry.plan}
                    decision={entry.decision}
                    error={entry.decisionError}
                    busy={deciding !== null}
                    onChoice={(choice) => { if (entry.plan?.id) void decide(index, entry.plan.id, choice) }}
                    onRevise={() => { if (entry.plan?.id) void revise(index, entry.plan.id) }}
                  />
                )}
                {entry.error && <p className="ask-error" role="alert">{entry.error}</p>}
                {!entry.plan && !entry.error && (entry.activity?.length ?? 0) === 0 && (
                  <p className="ask-thinking">Tod is working…</p>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="ask-composer-wrap" onSubmit={(event) => void send(event)}>
        {commandMenuOpen && (
          <AskCommandPalette
            capabilities={commandOptions}
            activeIndex={activeCommandIndex}
            onSelect={selectCommand}
          />
        )}
        <div className="ask-composer">
          <div className="ask-mode-picker" ref={modeMenuRef}>
            <button
              type="button"
              className={`ask-mode-trigger${approvalMode === "auto" ? " ask-mode-trigger-auto" : ""}`}
              onClick={() => setModeMenuOpen((open) => !open)}
              disabled={busy || deciding !== null}
              aria-label={`Execution mode: ${approvalMode === "auto" ? "Auto execute" : "Manual approval"}`}
              aria-haspopup="menu"
              aria-expanded={modeMenuOpen}
              title={approvalMode === "auto" ? "Auto execute" : "Manual approval"}
            >
              {approvalMode === "auto" ? <Zap size={17} /> : <ShieldCheck size={17} />}
            </button>
            {modeMenuOpen && (
              <div className="ask-mode-menu" role="menu" aria-label="Execution mode">
                <button
                  type="button"
                  className="ask-mode-option"
                  role="menuitemradio"
                  aria-checked={approvalMode === "manual"}
                  onClick={() => { setApprovalMode("manual"); setModeMenuOpen(false); inputRef.current?.focus() }}
                >
                  <ShieldCheck size={17} />
                  <span><strong>Manual approval</strong><small>Review every proposed change</small></span>
                  {approvalMode === "manual" && <Check size={15} />}
                </button>
                <button
                  type="button"
                  className="ask-mode-option"
                  role="menuitemradio"
                  aria-checked={approvalMode === "auto"}
                  onClick={() => { setApprovalMode("auto"); setModeMenuOpen(false); inputRef.current?.focus() }}
                >
                  <Zap size={17} />
                  <span><strong>Auto execute</strong><small>Apply validated changes immediately</small></span>
                  {approvalMode === "auto" && <Check size={15} />}
                </button>
              </div>
            )}
          </div>
          <textarea
            ref={inputRef}
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value)
              setCommandMenuDismissed(false)
            }}
            onKeyDown={(event) => {
              if (commandMenuOpen && event.key === "ArrowDown" && commandOptions.length > 0) {
                event.preventDefault()
                setActiveCommandIndex((index) => (index + 1) % commandOptions.length)
                return
              }
              if (commandMenuOpen && event.key === "ArrowUp" && commandOptions.length > 0) {
                event.preventDefault()
                setActiveCommandIndex((index) => (index - 1 + commandOptions.length) % commandOptions.length)
                return
              }
              if (commandMenuOpen && event.key === "Escape") {
                event.preventDefault()
                setCommandMenuDismissed(true)
                return
              }
              if (commandMenuOpen && event.key === "Enter" && !event.shiftKey && commandOptions[activeCommandIndex]) {
                event.preventDefault()
                selectCommand(commandOptions[activeCommandIndex])
                return
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void send()
              }
            }}
            disabled={status !== "ready" || busy || deciding !== null}
            placeholder={status === "ready" ? "Ask Tod anything or request a change…" : "Configure an AI provider to ask Tod"}
            aria-label="Question for Tod"
            aria-expanded={commandMenuOpen}
            aria-controls={commandMenuOpen ? "ask-command-palette" : undefined}
            rows={2}
          />
          <button
            type="button"
            className={`ask-mic${dictation.listening ? " ask-mic-listening" : ""}`}
            onClick={() => void dictation.toggle()}
            disabled={!dictation.supported || dictation.preparing || status !== "ready" || busy || deciding !== null}
            aria-label={dictation.listening ? "Stop dictation" : "Start on-device dictation"}
            aria-pressed={dictation.listening}
            title={dictation.supported ? "Dictate on this device" : "On-device dictation is not supported in this browser"}
          >
            {dictation.listening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
          <button className="ask-send" type="submit" aria-label="Send question" disabled={!question.trim() || busy || deciding !== null || status !== "ready"}>
            <ArrowUp size={18} />
          </button>
        </div>
        {(dictation.error || dictation.preparing || dictation.listening) && (
          <div className="ask-composer-footer">
            <p role="status">
              {dictation.error || (dictation.preparing ? "Preparing on-device dictation…" : "Listening on this device…")}
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
