import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { Menu, Search } from "lucide-react"
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
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="topbar-menu" onClick={toggle} aria-label="Toggle sidebar">
          <Menu size={18} />
        </button>
        <Link to="/" className="topbar-brand" aria-label="TodAI home">
          <AppLogo size={30} />
          <span className="topbar-brand-name">TodAI</span>
        </Link>
      </div>

      <div className="topbar-actions">
        <button type="button" className="topbar-search" onClick={() => setSearchOpen(true)} aria-label="Search everything">
          <Search size={15} />
          <span>Find anything</span>
          <kbd>Ctrl K</kbd>
        </button>
        <button
          type="button"
          className="ask-launcher"
          onClick={toggleAsk}
          aria-label={askOpen ? "Close Ask Tod" : "Open Ask Tod"}
          aria-expanded={askOpen}
          aria-controls="ask-drawer"
          title="Ask Tod"
        >
          <TodLogo size={25} />
          {askRunning && <span className="ask-running-badge" aria-label="Tod is working" />}
        </button>
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
