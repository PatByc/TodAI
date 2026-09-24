import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { Ellipsis, Menu, Search, Timer, X } from "lucide-react"
import { useSidebarStore } from "@/stores/sidebar"
import { useAskStore } from "@/stores/ask"
import { SearchDialog } from "@/components/search/SearchDialog"
import { AppLogo } from "@/components/AppLogo"
import { TodLogo } from "@/components/TodLogo"

export function Topbar() {
  const toggle = useSidebarStore((state) => state.toggle)
  const askOpen = useAskStore((state) => state.isOpen)
  const toggleAsk = useAskStore((state) => state.toggle)
  const askRunning = useAskStore((state) => state.isRunning)
  const [searchOpen, setSearchOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(() => (
    typeof window !== "undefined" && window.localStorage.getItem("todai.topbar.actions-open") === "true"
  ))

  useEffect(() => {
    window.localStorage.setItem("todai.topbar.actions-open", String(actionsOpen))
  }, [actionsOpen])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditing = target?.matches("input, textarea, [contenteditable='true']")
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen(true)
      } else if (event.key === "/" && !isEditing) {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener("keydown", handleShortcut)
    return () => {
      window.removeEventListener("keydown", handleShortcut)
    }
  }, [])

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="topbar-menu" onClick={toggle} aria-label="Toggle sidebar">
          <Menu size={18} />
        </button>
        <Link to="/" className="topbar-brand" aria-label="TodAI home">
          <AppLogo size={72} />
        </Link>
      </div>

      <div className="topbar-action-dock">
        <div id="topbar-actions" className={`topbar-actions${actionsOpen ? " topbar-actions-open" : ""}`} aria-hidden={!actionsOpen}>
          <button type="button" className="topbar-search" tabIndex={actionsOpen ? 0 : -1} onClick={() => setSearchOpen(true)} aria-label="Search everything">
            <Search size={15} />
            <span>Find anything</span>
            <kbd>Ctrl K</kbd>
          </button>
          <button type="button" className="timer-launcher" tabIndex={actionsOpen ? 0 : -1} aria-label="Start timer">
            <Timer size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>Start timer</span>
          </button>
          <button
            type="button"
            className={`ask-launcher${askOpen ? " ask-launcher-hidden" : ""}`}
            tabIndex={actionsOpen && !askOpen ? 0 : -1}
            onClick={toggleAsk}
            aria-label={askOpen ? "Close Ask Tod" : "Open Ask Tod"}
            aria-expanded={askOpen}
            aria-controls="ask-drawer"
            title="Ask Tod"
          >
            <TodLogo size={25} />
            <span className="ask-launcher-label">Ask Tod</span>
            {askRunning && <span className="ask-running-badge" aria-label="Tod is working" />}
          </button>
        </div>
        <button
          type="button"
          className="topbar-actions-toggle"
          onClick={() => setActionsOpen((current) => !current)}
          aria-label={actionsOpen ? "Close quick actions" : "Open quick actions"}
          aria-expanded={actionsOpen}
          aria-controls="topbar-actions"
        >
          {actionsOpen ? <X size={17} aria-hidden="true" /> : <Ellipsis size={19} aria-hidden="true" />}
          {askRunning && !actionsOpen && <span className="topbar-actions-status" aria-label="Tod is working" />}
        </button>
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
