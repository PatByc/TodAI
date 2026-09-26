import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  CheckSquare,
  FileText,
  Inbox,
  Lightbulb,
  LoaderCircle,
  Search,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react"
import { searchEverything, type SearchResult } from "@/api/search"

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

const icons: Record<SearchResult["entity_type"], LucideIcon> = {
  note: FileText,
  task: CheckSquare,
  idea: Lightbulb,
  project: Sparkles,
  inbox_item: Inbox,
}

const labels: Record<SearchResult["entity_type"], string> = {
  note: "Note",
  task: "Task",
  idea: "Idea",
  project: "Project",
  inbox_item: "Inbox",
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const requestSequence = useRef(0)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(false)
  const [semanticAvailable, setSemanticAvailable] = useState(false)

  useEffect(() => {
    if (!open) return
    setQuery("")
    setResults([])
    setSelected(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    const requestId = ++requestSequence.current
    const trimmedQuery = query.trim()
    if (!open || !trimmedQuery) {
      setResults([])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setResults([])
    setLoading(true)
    const timeout = window.setTimeout(async () => {
      try {
        const response = await searchEverything(trimmedQuery, "hybrid", controller.signal)
        if (requestSequence.current !== requestId) return
        setResults(response.results)
        setSemanticAvailable(response.semantic_available)
        setSelected(0)
      } catch (error) {
        if (
          requestSequence.current === requestId
          && !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setResults([])
        }
      } finally {
        if (requestSequence.current === requestId) setLoading(false)
      }
    }, 180)
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [open, query])

  if (!open) return null

  const openResult = (result: SearchResult) => {
    onClose()
    const id = String(result.entity_id)
    if (result.entity_type === "note") {
      void navigate({ to: "/notes/$noteId", params: { noteId: id } })
    } else if (result.entity_type === "task") {
      void navigate({ to: "/tasks/$taskId", params: { taskId: id } })
    } else if (result.entity_type === "idea") {
      void navigate({ to: "/ideas/$ideaId", params: { ideaId: id } })
    } else if (result.entity_type === "project") {
      void navigate({ to: "/projects/$projectId", params: { projectId: id } })
    } else {
      void navigate({ to: "/inbox" })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center px-4"
      style={{ background: "rgba(3, 12, 7, 0.72)", backdropFilter: "blur(4px)", paddingTop: "12vh" }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Search everything"
        className="w-full overflow-hidden rounded-xl"
        style={{
          maxWidth: 680,
          height: "fit-content",
          maxHeight: "68vh",
          background: "var(--popover)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 80px rgba(0,0,0,.48)",
        }}
      >
        <div className="flex items-center gap-3 px-4" style={{ height: 58, borderBottom: "1px solid var(--border)" }}>
          {loading ? <LoaderCircle className="animate-spin" size={19} /> : <Search size={19} />}
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose()
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setSelected((value) => Math.min(value + 1, results.length - 1))
              }
              if (event.key === "ArrowUp") {
                event.preventDefault()
                setSelected((value) => Math.max(value - 1, 0))
              }
              if (event.key === "Enter" && results[selected]) openResult(results[selected])
            }}
            placeholder="Search notes, tasks, ideas, projects and inbox…"
            className="search-dialog-input min-w-0 flex-1 bg-transparent text-base outline-none"
            aria-label="Search query"
          />
          <button onClick={onClose} aria-label="Close search" className="rounded-md p-1.5 hover:bg-[var(--bg-hover)]">
            <X size={17} />
          </button>
        </div>

        <div
          className="overflow-y-auto p-2"
          style={{ minHeight: 176, maxHeight: "calc(68vh - 98px)" }}
        >
          {!query.trim() && (
            <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
              Type a title, keyword, tag, or natural-language description.
            </div>
          )}
          {query.trim() && loading && (
            <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
              Searching…
            </div>
          )}
          {query.trim() && !loading && results.length === 0 && (
            <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
              No matches for “{query}”
            </div>
          )}
          {results.map((result, index) => {
            const Icon = icons[result.entity_type]
            return (
              <button
                key={`${result.entity_type}:${result.entity_id}`}
                onMouseEnter={() => setSelected(index)}
                onClick={() => openResult(result)}
                className="flex w-full items-start gap-3 rounded-lg p-3 text-left"
                style={{ background: selected === index ? "var(--bg-hover)" : "transparent" }}
              >
                <div className="mt-0.5 rounded-md p-2" style={{ background: "var(--secondary)", color: "var(--primary)" }}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <strong className="truncate text-sm">{result.title || "Untitled"}</strong>
                    <span className="text-xs" style={{ color: "var(--text-3)" }}>{labels[result.entity_type]}</span>
                  </div>
                  {result.snippet && (
                    <p className="mt-1 line-clamp-2 text-xs leading-5" style={{ color: "var(--muted-foreground)" }}>
                      {result.snippet}
                    </p>
                  )}
                  {result.tags.length > 0 && (
                    <div className="mt-2 flex gap-1.5">
                      {result.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <footer className="flex items-center justify-between px-4 text-[11px]" style={{ height: 40, borderTop: "1px solid var(--border)", color: "var(--text-3)" }}>
          <span>↑↓ select · Enter open · Esc close</span>
          <span>{semanticAvailable ? "Hybrid search" : "Keyword search · AI optional"}</span>
        </footer>
      </section>
    </div>
  )
}
