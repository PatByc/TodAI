import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, Check, FolderKanban, Sparkles } from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { completeOnboarding, skipOnboarding, type OnboardingState } from "@/api/onboarding"
import { getAgentStatus } from "@/api/agent"
import { TodLogo } from "@/components/TodLogo"
import { useAskStore } from "@/stores/ask"
import { useOnboardingStore, type OnboardingTarget } from "@/stores/onboarding"

type StepId = "welcome" | "starter" | "today" | "plan" | "ask"

interface Step {
  id: StepId
  eyebrow: string
  title: string
  body: string
  target: OnboardingTarget
}

const firstRunSteps: Step[] = [
  {
    id: "welcome",
    eyebrow: "A calmer place to begin",
    title: "Hello. I’m Tod.",
    body: "I’ll help you turn what matters into a clear next step. First, what should I call you?",
    target: null,
  },
  {
    id: "starter",
    eyebrow: "Start with something real",
    title: "What are you moving forward?",
    body: "Give the work a home, then name the smallest useful action you can take next.",
    target: null,
  },
  {
    id: "today",
    eyebrow: "One day at a time",
    title: "Today keeps the signal clear.",
    body: "Your open work, routines, plans, and recent wins gather here without turning into a dashboard maze.",
    target: "today",
  },
  {
    id: "plan",
    eyebrow: "Shape the work",
    title: "Plan gives intention a place.",
    body: "Use the navigation to schedule focused blocks, build routines, and keep goals connected to actual time.",
    target: "plan",
  },
  {
    id: "ask",
    eyebrow: "Your workspace, with a copilot",
    title: "Ask Tod when the next move is fuzzy.",
    body: "Tod can inspect what you’ve saved and prepare changes. Manual approval keeps every action reviewable.",
    target: "ask",
  },
]

const replaySteps = firstRunSteps.filter((step) => step.target !== null)

function targetSelector(target: OnboardingTarget) {
  return target ? `[data-onboarding-target="${target}"]` : ""
}

function cardPosition(rect: DOMRect | null): React.CSSProperties {
  if (!rect || window.innerWidth <= 720) return {}
  const width = 390
  const gap = 24
  const rightSpace = window.innerWidth - rect.right
  const leftSpace = rect.left
  if (rightSpace >= width + gap) {
    return { left: rect.right + gap, top: Math.max(84, Math.min(rect.top, window.innerHeight - 460)) }
  }
  if (leftSpace >= width + gap) {
    return { left: rect.left - width - gap, top: Math.max(84, Math.min(rect.top, window.innerHeight - 460)) }
  }
  return {
    left: Math.max(24, Math.min(window.innerWidth - width - 24, rect.left + rect.width / 2 - width / 2)),
    top: Math.max(24, Math.min(window.innerHeight - 420, rect.bottom + gap)),
  }
}

export function OnboardingTour({
  mode,
  state,
  onDismiss,
}: {
  mode: "first-run" | "replay"
  state: OnboardingState
  onDismiss: () => void
}) {
  const steps = mode === "first-run" ? firstRunSteps : replaySteps
  const [stepIndex, setStepIndex] = useState(0)
  const [displayName, setDisplayName] = useState(state.display_name ?? "")
  const [projectName, setProjectName] = useState("")
  const [taskTitle, setTaskTitle] = useState("")
  const [validationError, setValidationError] = useState("")
  const [rect, setRect] = useState<DOMRect | null>(null)
  const cardRef = useRef<HTMLElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const closeAsk = useAskStore((current) => current.close)
  const setActiveTarget = useOnboardingStore((current) => current.setActiveTarget)
  const closeReplay = useOnboardingStore((current) => current.closeReplay)
  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1
  const isReplay = mode === "replay"
  const { data: agentStatus } = useQuery({
    queryKey: ["agent", "status"],
    queryFn: getAgentStatus,
    retry: false,
  })
  const completeMutation = useMutation({ mutationFn: completeOnboarding })
  const skipMutation = useMutation({ mutationFn: skipOnboarding })

  useEffect(() => {
    setActiveTarget(step.target)
    if (step.target) {
      void navigate({ to: "/" })
    }
    if (step.target === "ask") closeAsk()
    return () => setActiveTarget(null)
  }, [step.target, navigate, closeAsk, setActiveTarget])

  useLayoutEffect(() => {
    if (!step.target) {
      setRect(null)
      return
    }
    let target: Element | null = null
    let observer: ResizeObserver | null = null
    let mutationObserver: MutationObserver | null = null
    const update = () => {
      target = document.querySelector(targetSelector(step.target))
      if (!target) return
      target.scrollIntoView({ block: "center", behavior: "smooth" })
      setRect(target.getBoundingClientRect())
      mutationObserver?.disconnect()
      observer?.disconnect()
      observer = new ResizeObserver(() => setRect(target?.getBoundingClientRect() ?? null))
      observer.observe(target)
    }
    const frame = window.requestAnimationFrame(update)
    const settleTimer = window.setTimeout(update, 360)
    mutationObserver = new MutationObserver(update)
    mutationObserver.observe(document.getElementById("root") ?? document.body, { childList: true, subtree: true })
    const onViewportChange = () => setRect(target?.getBoundingClientRect() ?? null)
    window.addEventListener("resize", onViewportChange)
    document.addEventListener("scroll", onViewportChange, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      observer?.disconnect()
      mutationObserver?.disconnect()
      window.removeEventListener("resize", onViewportChange)
      document.removeEventListener("scroll", onViewportChange, true)
    }
  }, [step.target])

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const preferred = card.querySelector<HTMLElement>("input, button")
    preferred?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isReplay) {
        event.preventDefault()
        closeReplay()
        onDismiss()
        return
      }
      if (event.key !== "Tab") return
      const controls = Array.from(card.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled)",
      ))
      if (controls.length === 0) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [stepIndex, isReplay, closeReplay, onDismiss])

  const review = useMemo(() => ({
    project: projectName.trim(),
    task: taskTitle.trim(),
  }), [projectName, taskTitle])

  const moveNext = () => {
    setValidationError("")
    if (step.id === "starter" && (!review.project || !review.task)) {
      setValidationError("Add both a project and its first next step.")
      return
    }
    if (isLast) {
      if (isReplay) {
        closeReplay()
        onDismiss()
        return
      }
      completeMutation.mutate({
        display_name: displayName.trim() || null,
        project_name: review.project,
        task_title: review.task,
      }, {
        onSuccess: (next) => {
          queryClient.setQueryData(["onboarding"], next)
          void queryClient.invalidateQueries({ queryKey: ["today"] })
          void queryClient.invalidateQueries({ queryKey: ["tasks"] })
          void queryClient.invalidateQueries({ queryKey: ["projects"] })
          void queryClient.invalidateQueries({ queryKey: ["counts"] })
          void navigate({ to: "/" })
          onDismiss()
        },
      })
      return
    }
    setStepIndex((current) => current + 1)
  }

  const skip = () => {
    if (isReplay) {
      closeReplay()
      onDismiss()
      return
    }
    skipMutation.mutate(undefined, {
      onSuccess: (next) => {
        queryClient.setQueryData(["onboarding"], next)
        onDismiss()
      },
      onError: () => {
        window.sessionStorage.setItem("todai.onboarding.dismissed-for-session", "true")
        onDismiss()
      },
    })
  }

  const busy = completeMutation.isPending || skipMutation.isPending
  const mutationError = completeMutation.error
    ? completeMutation.error instanceof Error ? completeMutation.error.message : "Could not create your workspace."
    : ""

  return (
    <div className="onboarding-layer" aria-live="polite">
      {rect ? (
        <div
          className="onboarding-spotlight"
          style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }}
          aria-hidden="true"
        />
      ) : <div className="onboarding-veil" aria-hidden="true" />}

      <section
        ref={cardRef}
        className={`onboarding-card${rect ? " is-anchored" : " is-centered"}`}
        style={cardPosition(rect)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <header className="onboarding-card-head">
          <span className="onboarding-tod-mark"><TodLogo size={31} /></span>
          <div>
            <span>{step.eyebrow}</span>
            <small>{stepIndex + 1} / {steps.length}</small>
          </div>
        </header>

        <div className="onboarding-progress" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }} aria-hidden="true">
          {steps.map((item, index) => <i key={item.id} className={index <= stepIndex ? "is-active" : ""} />)}
        </div>

        <div className="onboarding-copy">
          <h1 id="onboarding-title">{step.title}</h1>
          <p>{step.body}</p>
        </div>

        {step.id === "welcome" && (
          <label className="onboarding-field">
            <span>Your first name <small>optional</small></span>
            <input
              value={displayName}
              maxLength={80}
              autoComplete="given-name"
              placeholder="How Tod should greet you"
              onChange={(event) => setDisplayName(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") moveNext() }}
            />
          </label>
        )}

        {step.id === "starter" && (
          <div className="onboarding-starter-fields">
            <label className="onboarding-field">
              <span>Starter project</span>
              <input
                value={projectName}
                maxLength={500}
                placeholder="Launch my portfolio"
                onChange={(event) => setProjectName(event.target.value)}
              />
            </label>
            <label className="onboarding-field">
              <span>First next step</span>
              <input
                value={taskTitle}
                maxLength={500}
                placeholder="Choose the three strongest projects"
                onChange={(event) => setTaskTitle(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") moveNext() }}
              />
            </label>
          </div>
        )}

        {step.id === "ask" && !isReplay && (
          <div className="onboarding-review">
            <div><FolderKanban size={16} /><span><small>Project</small><strong>{review.project}</strong></span></div>
            <div><Check size={16} /><span><small>Next task</small><strong>{review.task}</strong></span></div>
          </div>
        )}

        {step.id === "ask" && agentStatus && !agentStatus.available && (
          <p className="onboarding-ai-note"><Sparkles size={14} /> Ask Tod can be enabled later. Your workspace works without an AI provider.</p>
        )}

        {(validationError || mutationError) && (
          <p className="onboarding-error" role="alert">{validationError || mutationError}</p>
        )}

        <footer className="onboarding-actions">
          <button type="button" className="onboarding-skip" onClick={skip} disabled={busy}>
            {isReplay ? "Close tour" : "Skip for now"}
          </button>
          <span />
          {stepIndex > 0 && (
            <button type="button" className="onboarding-back" onClick={() => setStepIndex((current) => current - 1)} disabled={busy}>
              <ArrowLeft size={15} /> Back
            </button>
          )}
          <button type="button" className="onboarding-next" onClick={moveNext} disabled={busy}>
            {busy ? "Saving…" : isLast ? isReplay ? "Finish tour" : "Create workspace" : "Continue"}
            {!busy && !isLast && <ArrowRight size={15} />}
          </button>
        </footer>
      </section>
    </div>
  )
}
