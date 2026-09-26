import { useEffect, useRef, useState } from "react"
import {
  Check,
  ChevronDown,
  Loader2,
  Sparkles,
  X,
} from "lucide-react"
import {
  useDraftReviewReflection,
  useReviewReflection,
  useSaveReviewReflection,
} from "@/hooks/useReview"
import type {
  ReviewReflectionDraft,
  ReviewReflectionLocator,
} from "@/types/entities"

const EMPTY_REFLECTION: ReviewReflectionDraft = {
  what_worked: "",
  friction: "",
  adjustment: "",
  patterns: [],
}

const PROMPTS: Array<{
  key: "what_worked" | "friction" | "adjustment"
  label: string
  placeholder: string
}> = [
  { key: "what_worked", label: "What worked?", placeholder: "What helped progress feel easier?" },
  { key: "friction", label: "What caused friction?", placeholder: "Where did attention or momentum break?" },
  { key: "adjustment", label: "What will I adjust?", placeholder: "Choose one change for the next period." },
]

function hasWriting(value: ReviewReflectionDraft) {
  return Boolean(
    value.what_worked.trim()
    || value.friction.trim()
    || value.adjustment.trim()
    || value.patterns.length,
  )
}

export function ReviewReflection({ locator }: { locator: ReviewReflectionLocator }) {
  const query = useReviewReflection(locator)
  const save = useSaveReviewReflection(locator)
  const draft = useDraftReviewReflection(locator)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const revision = useRef(0)
  const [open, setOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [writing, setWriting] = useState<ReviewReflectionDraft>(EMPTY_REFLECTION)
  const [pendingDraft, setPendingDraft] = useState<ReviewReflectionDraft | null>(null)

  useEffect(() => {
    if (query.data === undefined || dirty) return
    setWriting(query.data ? {
      what_worked: query.data.what_worked,
      friction: query.data.friction,
      adjustment: query.data.adjustment,
      patterns: query.data.patterns,
    } : EMPTY_REFLECTION)
    setDirty(false)
  }, [query.data])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const commit = (value: ReviewReflectionDraft) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const savedRevision = revision.current
    save.mutate(value, {
      onSuccess: () => {
        if (revision.current === savedRevision) setDirty(false)
      },
    })
  }

  const changeField = (key: typeof PROMPTS[number]["key"], value: string) => {
    const next = { ...writing, [key]: value }
    revision.current += 1
    setWriting(next)
    setDirty(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => commit(next), 1_200)
  }

  const acceptDraft = () => {
    if (!pendingDraft) return
    revision.current += 1
    setWriting(pendingDraft)
    setPendingDraft(null)
    setDirty(false)
    commit(pendingDraft)
  }

  const removePattern = (index: number) => {
    const next = { ...writing, patterns: writing.patterns.filter((_, itemIndex) => itemIndex !== index) }
    revision.current += 1
    setWriting(next)
    setDirty(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => commit(next), 1_200)
  }

  const saved = hasWriting(writing) || Boolean(query.data)
  const status = save.isPending ? "Saving…" : dirty ? "Unsaved" : saved ? "Saved" : "Not started"
  const error = draft.error || save.error || query.error

  return (
    <section className={`review-reflection${open ? " is-open" : ""}`} aria-labelledby="review-reflection-title">
      <div className="review-reflection-bar">
        <button type="button" className="review-reflection-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          <ChevronDown size={14} aria-hidden="true" />
          <span>
            <strong id="review-reflection-title">Reflection</strong>
            <small>{saved ? "Your notes for this period" : "Close the loop in three questions"}</small>
          </span>
          <em className={save.isPending || dirty ? "is-working" : saved ? "is-saved" : ""}>{status}</em>
        </button>
        <button
          type="button"
          className="review-reflection-draft-button"
          onClick={() => draft.mutate(undefined, { onSuccess: (value) => { setPendingDraft(value); setOpen(true) } })}
          disabled={draft.isPending}
        >
          {draft.isPending ? <Loader2 className="review-reflection-spinner" size={14} /> : <Sparkles size={14} />}
          {draft.isPending ? "Tod is reading…" : saved ? "Redraft with Tod" : "Draft with Tod"}
        </button>
      </div>

      {open && (
        <div className="review-reflection-body">
          {pendingDraft && (
            <div className="review-reflection-proposal">
              <div className="review-reflection-proposal-head">
                <div><Sparkles size={14} /><span><strong>Tod’s draft</strong><small>Review it before adding it to this period.</small></span></div>
                <button type="button" onClick={() => setPendingDraft(null)} aria-label="Discard Tod’s draft"><X size={14} /></button>
              </div>
              <div className="review-reflection-proposal-copy">
                {PROMPTS.map((prompt) => <div key={prompt.key}><span>{prompt.label}</span><p>{pendingDraft[prompt.key] || "No observation."}</p></div>)}
              </div>
              {pendingDraft.patterns.length > 0 && <div className="review-reflection-proposal-patterns">
                {pendingDraft.patterns.map((pattern) => <p key={`${pattern.text}-${pattern.evidence}`}><strong>{pattern.text}</strong><span>{pattern.evidence}</span></p>)}
              </div>}
              <div className="review-reflection-proposal-actions">
                <button type="button" onClick={() => setPendingDraft(null)}>Discard</button>
                <button type="button" onClick={acceptDraft}><Check size={13} /> Accept draft</button>
              </div>
            </div>
          )}

          <div className="review-reflection-fields">
            {PROMPTS.map((prompt) => (
              <label key={prompt.key}>
                <span>{prompt.label}</span>
                <textarea
                  rows={3}
                  value={writing[prompt.key]}
                  placeholder={prompt.placeholder}
                  onChange={(event) => changeField(prompt.key, event.target.value)}
                  onBlur={() => dirty && commit(writing)}
                />
              </label>
            ))}
          </div>

          {writing.patterns.length > 0 && (
            <div className="review-reflection-patterns">
              <span>Patterns Tod noticed</span>
              <div>{writing.patterns.map((pattern, index) => <p key={`${pattern.text}-${pattern.evidence}`}><strong>{pattern.text}</strong><small>{pattern.evidence}</small><button type="button" onClick={() => removePattern(index)} aria-label="Remove this pattern"><X size={12} /></button></p>)}</div>
            </div>
          )}
          {error && <p className="review-reflection-error" role="alert">{error.message}</p>}
        </div>
      )}
    </section>
  )
}
