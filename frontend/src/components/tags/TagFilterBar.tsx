import { Check, ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useSearchTags } from "@/hooks/useTags"
import { useFilterStore } from "@/stores/filters"
import { useProjects } from "@/hooks/useProjects"
import { getTagColor } from "@/lib/colors"
import { SelectDropdown } from "@/components/ui/SelectDropdown"
import type { TagResponse } from "@/types/entities"
import type { FilterScope } from "@/stores/filters"

interface TagFilterBarProps {
  scope: FilterScope
  allTags?: TagResponse[]
  showProjectFilter?: boolean
}

export function TagFilterBar({ scope, allTags = [], showProjectFilter = true }: TagFilterBarProps) {
  const selectedTagIds = useFilterStore((state) => state.byScope[scope].selectedTagIds)
  const tagLogic = useFilterStore((state) => state.byScope[scope].tagLogic)
  const selectedProjectId = useFilterStore((state) => state.byScope[scope].selectedProjectId)
  const toggleTag = useFilterStore((state) => state.toggleTag)
  const clearTags = useFilterStore((state) => state.clearTags)
  const setTagLogic = useFilterStore((state) => state.setTagLogic)
  const setSelectedProjectId = useFilterStore((state) => state.setSelectedProjectId)
  const { data: projectsData } = useProjects({ include_archived: false })
  const projects = projectsData?.items ?? []
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)
  const { data: searchResults = [] } = useSearchTags(query)
  const selectedTags = allTags.filter((tag) => selectedTagIds.includes(tag.id))
  const visibleTags = query.length >= 2 ? searchResults : allTags
  const triggerLabel = selectedTags.length === 0
    ? "All tags"
    : selectedTags.length === 1
      ? selectedTags[0].name
      : `${selectedTags.length} tags`

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery("")
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [])

  return (
    <div className="tag-filter-controls">
      {showProjectFilter && (
        <SelectDropdown
          value={selectedProjectId === null ? "" : String(selectedProjectId)}
          options={[
            { value: "", label: "All projects" },
            ...projects.map((project) => ({ value: String(project.id), label: project.name })),
          ]}
          onChange={(nextValue) => setSelectedProjectId(scope, nextValue ? Number(nextValue) : null)}
          ariaLabel="Filter by project"
          size="compact"
          muted={selectedProjectId === null}
        />
      )}

      <div ref={rootRef} className={`ui-select ui-select-compact tag-filter-select${isOpen ? " ui-select-open" : ""}`}>
        <button
          type="button"
          className={`ui-select-trigger${selectedTags.length === 0 ? " is-muted" : ""}`}
          onClick={() => setIsOpen((current) => !current)}
          aria-label="Filter by tags"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="ui-select-value">
            {selectedTags.length === 1 && (
              <span className="ui-select-dot" style={{ backgroundColor: getTagColor(selectedTags[0].color_index) }} />
            )}
            <span className="ui-select-label">{triggerLabel}</span>
          </span>
          <ChevronDown className="ui-select-chevron" size={13} strokeWidth={1.8} aria-hidden="true" />
        </button>

        {isOpen && (
          <div className="ui-select-menu tag-filter-menu">
            <div className="tag-filter-search">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tags…"
                autoFocus
              />
            </div>

            <div className="tag-filter-options" role="listbox" aria-label="Tags" aria-multiselectable="true">
              {!query && (
                <button
                  type="button"
                  className="ui-select-option"
                  onClick={() => clearTags(scope)}
                  role="option"
                  aria-selected={selectedTags.length === 0}
                >
                  <span className="ui-select-option-content">All tags</span>
                  {selectedTags.length === 0 && <Check size={13} strokeWidth={2} aria-hidden="true" />}
                </button>
              )}

              {visibleTags.length === 0 ? (
                <p className="tag-filter-empty">{query.length >= 2 ? "No matching tags" : "No tags available"}</p>
              ) : visibleTags.map((tag: TagResponse) => {
                const selected = selectedTagIds.includes(tag.id)
                return (
                  <button
                    type="button"
                    key={tag.id}
                    className="ui-select-option"
                    onClick={() => toggleTag(scope, tag.id)}
                    role="option"
                    aria-selected={selected}
                  >
                    <span className="ui-select-option-content">
                      <span className="ui-select-dot" style={{ backgroundColor: getTagColor(tag.color_index) }} />
                      <span>{tag.name}</span>
                    </span>
                    {selected && <Check size={13} strokeWidth={2} aria-hidden="true" />}
                  </button>
                )
              })}
            </div>

            {selectedTags.length > 1 && (
              <div className="tag-filter-logic">
                <span>Match</span>
                <button type="button" onClick={() => setTagLogic(scope, tagLogic === "and" ? "or" : "and")}>
                  {tagLogic === "and" ? "all selected tags" : "any selected tag"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
