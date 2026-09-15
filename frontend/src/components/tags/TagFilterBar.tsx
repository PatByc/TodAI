import { useState, useRef, useEffect } from "react"
import { Plus, X } from "lucide-react"
import { useSearchTags } from "@/hooks/useTags"
import { useFilterStore } from "@/stores/filters"
import { useProjects } from "@/hooks/useProjects"
import { getTagColor } from "@/lib/colors"
import type { TagResponse } from "@/types/entities"

interface TagFilterBarProps {
  allTags?: TagResponse[]
}

export function TagFilterBar({ allTags = [] }: TagFilterBarProps) {
  const { selectedTagIds, tagLogic, toggleTag, setTagLogic, selectedProjectId, setSelectedProjectId } = useFilterStore()
  const { data: projectsData } = useProjects({ include_archived: false })
  const projects = projectsData?.items ?? []
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const { data: searchResults = [] } = useSearchTags(query)

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id))

  const availableTags = query.length >= 2
    ? searchResults.filter((t: TagResponse) => !selectedTagIds.includes(t.id))
    : allTags.filter((t) => !selectedTagIds.includes(t.id))

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        minHeight: "32px",
      }}
    >
      {/* Project filter */}
      <select
        value={selectedProjectId ?? ""}
        onChange={(e) => {
          const value = e.target.value
          setSelectedProjectId(value ? Number(value) : null)
        }}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          background: selectedProjectId ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "3px 22px 3px 8px",
          fontFamily: "var(--font-body)",
          fontSize: "11px",
          fontWeight: 500,
          color: selectedProjectId ? "var(--foreground)" : "var(--muted-foreground)",
          cursor: "pointer",
          outline: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 4px center",
          backgroundSize: "12px",
        }}
      >
        <option value="">All projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      {selectedTags.map((tag, i) => (
        <span key={tag.id} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "var(--font-body)",
              color: getTagColor(tag.color_index),
              backgroundColor: `color-mix(in srgb, ${getTagColor(tag.color_index)} 16%, transparent)`,
            }}
          >
            {tag.name}
            <button
              onClick={() => toggleTag(tag.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "inherit",
                opacity: 0.6,
              }}
            >
              <X size={10} />
            </button>
          </span>

          {i < selectedTags.length - 1 && (
            <button
              onClick={() => setTagLogic(tagLogic === "and" ? "or" : "and")}
              style={{
                background: "none",
                border: "none",
                padding: "2px 4px",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: "10px",
                fontWeight: 500,
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {tagLogic.toUpperCase()}
            </button>
          )}
        </span>
      ))}

      <div style={{ position: "relative" }}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 8px",
            borderRadius: "6px",
            border: "1px dashed var(--border)",
            background: "transparent",
            cursor: "pointer",
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-body)",
            fontSize: "11px",
            fontWeight: 500,
          }}
        >
          <Plus size={12} />
          tag
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "4px",
              minWidth: "200px",
              backgroundColor: "var(--secondary)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              zIndex: 20,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "8px" }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tags..."
                autoFocus
                style={{
                  width: "100%",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
            </div>
            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              {availableTags.length === 0 ? (
                <div
                  style={{
                    padding: "8px 12px",
                    color: "var(--muted-foreground)",
                    fontSize: "12px",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {query.length >= 2 ? "No matching tags" : "No tags available"}
                </div>
              ) : (
                availableTags.map((tag: TagResponse) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      toggleTag(tag.id)
                      setIsOpen(false)
                      setQuery("")
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      padding: "6px 12px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--foreground)",
                      fontFamily: "var(--font-body)",
                      fontSize: "13px",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: getTagColor(tag.color_index),
                        flexShrink: 0,
                      }}
                    />
                    {tag.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
