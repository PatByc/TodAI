import { Outlet, useRouterState } from "@tanstack/react-router"
import { useEffect } from "react"
import { Topbar } from "./Topbar"
import { Sidebar } from "./Sidebar"
import { AskDrawer } from "@/components/ask/AskDrawer"

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

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

  return (
    <div className="app-shell">
      <Topbar />

      <div className="workspace">
        <Sidebar />

        <main className="content-area">
          <div className="content-inner">
            <Outlet />
          </div>
        </main>
        <AskDrawer />
      </div>
    </div>
  )
}
