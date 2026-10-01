import { Outlet, useRouterState } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Topbar } from "./Topbar"
import { Sidebar } from "./Sidebar"
import { AskDrawer } from "@/components/ask/AskDrawer"
import { RestoreBanner } from "@/components/layout/RestoreBanner"
import { OnboardingTour } from "@/components/onboarding/OnboardingTour"
import { fetchOnboarding } from "@/api/onboarding"
import { useOnboardingStore } from "@/stores/onboarding"

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [dismissedForSession, setDismissedForSession] = useState(() => (
    typeof window !== "undefined" && window.sessionStorage.getItem("todai.onboarding.dismissed-for-session") === "true"
  ))
  const replayRequested = useOnboardingStore((state) => state.replayRequested)
  const onboarding = useQuery({
    queryKey: ["onboarding"],
    queryFn: fetchOnboarding,
    retry: false,
  })

  useEffect(() => {
    const activityTimers = new Map<Element, number>()
    const handleScroll = (event: Event) => {
      const scrollable = event.target instanceof Element
        ? event.target
        : document.scrollingElement
      if (!scrollable) return

      scrollable.classList.add("is-scrolling")
      const existingTimer = activityTimers.get(scrollable)
      if (existingTimer !== undefined) window.clearTimeout(existingTimer)
      activityTimers.set(scrollable, window.setTimeout(() => {
        scrollable.classList.remove("is-scrolling")
        activityTimers.delete(scrollable)
      }, 550))
    }

    document.addEventListener("scroll", handleScroll, true)
    return () => {
      document.removeEventListener("scroll", handleScroll, true)
      for (const [scrollable, timer] of activityTimers) {
        window.clearTimeout(timer)
        scrollable.classList.remove("is-scrolling")
      }
    }
  }, [])

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const targetId = decodeURIComponent(hash)
    const scrollToTarget = () => {
      const target = document.getElementById(targetId)
      if (!target) return false
      target.scrollIntoView({ block: "start" })
      return true
    }
    if (scrollToTarget()) return

    const observer = new MutationObserver(() => {
      if (scrollToTarget()) observer.disconnect()
    })
    observer.observe(document.getElementById("root")!, { childList: true, subtree: true })
    const timeout = window.setTimeout(() => observer.disconnect(), 5000)
    return () => {
      window.clearTimeout(timeout)
      observer.disconnect()
    }
  }, [pathname])

  const showFirstRun = Boolean(onboarding.data?.should_show && !dismissedForSession)
  const tourActive = Boolean(onboarding.data && (showFirstRun || replayRequested))

  return (
    <div className="app-shell">
      <Topbar inert={tourActive} />
      <RestoreBanner />

      <div className="workspace" inert={tourActive ? true : undefined}>
        <Sidebar />

        <main className="content-area">
          <div className="content-inner">
            <Outlet />
          </div>
        </main>
        <AskDrawer />
      </div>
      {onboarding.data && tourActive && (
        <OnboardingTour
          mode={replayRequested ? "replay" : "first-run"}
          state={onboarding.data}
          onDismiss={() => setDismissedForSession(true)}
        />
      )}
    </div>
  )
}
