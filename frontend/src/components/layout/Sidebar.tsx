import { useCallback, useEffect, useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { Archive, ArrowUpRight, CheckSquare, FileText, FolderOpen, Home, Inbox, Lightbulb } from "lucide-react"
import { useSidebarStore } from "@/stores/sidebar"
import { useAskStore } from "@/stores/ask"
import { useCounts } from "@/hooks/useCounts"
import { useFilterStore } from "@/stores/filters"
import { ExportButton } from "@/components/export/ExportButton"
import { TodLogo } from "@/components/TodLogo"

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [query])

  return matches
}

export function Sidebar() {
  const isCollapsed = useSidebarStore((state) => state.isCollapsed)
  const setCollapsed = useSidebarStore((state) => state.setCollapsed)
  const isMobile = useMediaQuery("(max-width: 768px)")

  useEffect(() => {
    if (isMobile) setCollapsed(true)
  }, [isMobile, setCollapsed])

  const closeOnMobile = useCallback(() => {
    if (isMobile) setCollapsed(true)
  }, [isMobile, setCollapsed])

  return (
    <>
      {isMobile && !isCollapsed && (
        <button type="button" className="sidebar-backdrop" onClick={() => setCollapsed(true)} aria-label="Close navigation" />
      )}
      <aside className={`sidebar${isMobile ? " sidebar-mobile" : ""}${isCollapsed ? " sidebar-collapsed" : ""}`}>
        <SidebarContent onNavClick={closeOnMobile} />
      </aside>
    </>
  )
}

function SidebarContent({ onNavClick }: { onNavClick: () => void }) {
  const askOpen = useAskStore((state) => state.isOpen)
  const openAsk = useAskStore((state) => state.open)
  const askRunning = useAskStore((state) => state.isRunning)
  const { data: counts } = useCounts()
  const { includeArchived, setIncludeArchived } = useFilterStore()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  const navItems = [
    { to: "/" as const, label: "Today", icon: Home, count: undefined },
    { to: "/inbox" as const, label: "Inbox", icon: Inbox, count: counts?.inbox },
    { to: "/tasks" as const, label: "Tasks", icon: CheckSquare, count: counts?.tasks },
    { to: "/notes" as const, label: "Notes", icon: FileText, count: counts?.notes },
    { to: "/ideas" as const, label: "Ideas", icon: Lightbulb, count: counts?.ideas },
    { to: "/projects" as const, label: "Projects", icon: FolderOpen, count: counts?.projects },
  ]

  return (
    <div className="sidebar-content">
      <button
        type="button"
        className="sidebar-ask"
        onClick={() => { openAsk(); onNavClick() }}
        aria-expanded={askOpen}
        aria-controls="ask-drawer"
      >
        <TodLogo size={25} />
        <span>Ask Tod</span>
        {askRunning && <span className="ask-running-badge" aria-label="Tod is working" />}
        <ArrowUpRight size={15} aria-hidden="true" />
      </button>

      <nav className="sidebar-nav" aria-label="Workspace">
        {navItems.map(({ to, label, icon: Icon, count }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavClick}
              className={`sidebar-link${active ? " sidebar-link-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
              {count !== undefined && <small className="sidebar-count">{count}</small>}
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className={`sidebar-link sidebar-archive${includeArchived ? " sidebar-archive-active" : ""}`}
          onClick={() => { setIncludeArchived(!includeArchived); onNavClick() }}
          aria-pressed={includeArchived}
        >
          <Archive size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>Show archived</span>
        </button>
        <ExportButton />
      </div>
    </div>
  )
}
