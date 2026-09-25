import { useCallback, useEffect, useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { Activity, CalendarDays, ChartNoAxesColumnIncreasing, CheckSquare, ChevronRight, Clock3, FileText, FolderOpen, Home, Inbox, Library, Lightbulb, Repeat2, Settings, Target } from "lucide-react"
import { useSidebarStore } from "@/stores/sidebar"
import { useCounts } from "@/hooks/useCounts"

const LIBRARY_STORAGE_KEY = "todai.sidebar.library-open"
const PROGRESS_STORAGE_KEY = "todai.sidebar.progress-open"

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
  const { data: counts } = useCounts()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [libraryOpen, setLibraryOpen] = useState(() => (
    typeof window !== "undefined" && window.localStorage.getItem(LIBRARY_STORAGE_KEY) === "true"
  ))
  const [progressOpen, setProgressOpen] = useState(() => (
    typeof window !== "undefined" && window.localStorage.getItem(PROGRESS_STORAGE_KEY) === "true"
  ))

  useEffect(() => {
    window.localStorage.setItem(LIBRARY_STORAGE_KEY, String(libraryOpen))
  }, [libraryOpen])

  useEffect(() => {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, String(progressOpen))
  }, [progressOpen])

  const primaryItems = [
    { to: "/" as const, label: "Today", description: "See what needs attention now", icon: Home, count: undefined },
    { to: "/plan" as const, label: "Plan", description: "Shape the days ahead", icon: CalendarDays, count: undefined },
    { to: "/tasks" as const, label: "Tasks", description: "Track actionable work", icon: CheckSquare, count: counts?.tasks },
  ]
  const progressItems = [
    { to: "/time" as const, label: "Time", description: "Review and adjust tracked time", icon: Clock3, count: undefined },
    { to: "/routines" as const, label: "Routines", description: "Shape repeating practices", icon: Repeat2, count: undefined },
    { to: "/goals" as const, label: "Goals", description: "Track targets for your attention", icon: Target, count: undefined },
  ]
  const libraryItems = [
    { to: "/inbox" as const, label: "Inbox", description: "Capture first, organize later", icon: Inbox, count: counts?.inbox },
    { to: "/notes" as const, label: "Notes", description: "Keep knowledge and context", icon: FileText, count: counts?.notes },
    { to: "/ideas" as const, label: "Ideas", description: "Develop early thoughts", icon: Lightbulb, count: counts?.ideas },
    { to: "/projects" as const, label: "Projects", description: "Connect related work", icon: FolderOpen, count: counts?.projects },
  ]
  const activeProgressItem = progressItems.find(({ to }) => pathname.startsWith(to))
  const activeLibraryItem = libraryItems.find(({ to }) => pathname.startsWith(to))

  const renderLink = ({ to, label, description, icon: Icon, count }: (typeof primaryItems)[number] | (typeof progressItems)[number] | (typeof libraryItems)[number], nested = false, groupOpen = true) => {
    const active = to === "/" ? pathname === "/" : pathname.startsWith(to)
    const hintId = `nav-hint-${label.toLowerCase()}`
    return (
      <Link
        key={to}
        to={to}
        onClick={onNavClick}
        className={`sidebar-link${nested ? " sidebar-link-nested" : ""}${active ? " sidebar-link-active" : ""}`}
        aria-current={active ? "page" : undefined}
        aria-describedby={hintId}
        tabIndex={nested && !groupOpen ? -1 : undefined}
      >
        <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
        <span>{label}</span>
        <span id={hintId} role="tooltip" className="sidebar-hint">
          <span className="sidebar-hint-head">
            <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
            <strong>{label}</strong>
            {count !== undefined && <small>{count} {count === 1 ? "item" : "items"}</small>}
          </span>
          <span className="sidebar-hint-description">{description}</span>
          <span className="sidebar-hint-route">{to}</span>
        </span>
      </Link>
    )
  }

  return (
    <div className="sidebar-content">
      <nav className="sidebar-nav" aria-label="Workspace">
        {primaryItems.map((item) => renderLink(item))}
        <div className={`sidebar-library${progressOpen ? " is-open" : ""}`}>
          <button
            type="button"
            className={`sidebar-group-trigger${activeProgressItem && !progressOpen ? " sidebar-group-active" : ""}`}
            onClick={() => setProgressOpen((current) => !current)}
            aria-expanded={progressOpen}
            aria-controls="sidebar-progress-items"
          >
            <ChartNoAxesColumnIncreasing size={17} strokeWidth={1.8} aria-hidden="true" />
            <span>Progress</span>
            {!progressOpen && activeProgressItem && <small>{activeProgressItem.label}</small>}
            <ChevronRight className="sidebar-group-chevron" size={14} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <div id="sidebar-progress-items" className="sidebar-library-reveal" aria-hidden={!progressOpen}>
            <div className="sidebar-library-items">
              {progressItems.map((item) => renderLink(item, true, progressOpen))}
            </div>
          </div>
        </div>
        <div className={`sidebar-library${libraryOpen ? " is-open" : ""}`}>
          <button
            type="button"
            className={`sidebar-group-trigger${activeLibraryItem && !libraryOpen ? " sidebar-group-active" : ""}`}
            onClick={() => setLibraryOpen((current) => !current)}
            aria-expanded={libraryOpen}
            aria-controls="sidebar-library-items"
          >
            <Library size={17} strokeWidth={1.8} aria-hidden="true" />
            <span>Library</span>
            {!libraryOpen && activeLibraryItem && <small>{activeLibraryItem.label}</small>}
            <ChevronRight className="sidebar-group-chevron" size={14} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <div id="sidebar-library-items" className="sidebar-library-reveal" aria-hidden={!libraryOpen}>
            <div className="sidebar-library-items">
              {libraryItems.map((item) => renderLink(item, true, libraryOpen))}
            </div>
          </div>
        </div>
      </nav>

      <div className="sidebar-footer">
        <Link
          to="/developer"
          onClick={onNavClick}
          className={`sidebar-link${pathname.startsWith("/developer") ? " sidebar-link-active" : ""}`}
          aria-current={pathname.startsWith("/developer") ? "page" : undefined}
        >
          <Activity size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>Developer</span>
        </Link>
        <Link
          to="/settings"
          onClick={onNavClick}
          className={`sidebar-link${pathname.startsWith("/settings") ? " sidebar-link-active" : ""}`}
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          aria-describedby="nav-hint-settings"
        >
          <Settings size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>Settings</span>
          <span id="nav-hint-settings" role="tooltip" className="sidebar-hint">
            <span className="sidebar-hint-head">
              <Settings size={15} strokeWidth={1.8} aria-hidden="true" />
              <strong>Settings</strong>
            </span>
            <span className="sidebar-hint-description">Configure TodAI</span>
            <span className="sidebar-hint-route">/settings</span>
          </span>
        </Link>
      </div>
    </div>
  )
}
