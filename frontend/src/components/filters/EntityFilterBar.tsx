import { Archive, Pin, SlidersHorizontal, X } from "lucide-react"
import { useState } from "react"
import type { ReactNode } from "react"
import { TagFilterBar } from "@/components/tags/TagFilterBar"
import { SelectDropdown } from "@/components/ui/SelectDropdown"
import { useFilterStore } from "@/stores/filters"
import type { SelectOption } from "@/components/ui/SelectDropdown"
import type { TagResponse } from "@/types/entities"

interface EntityFilterBarProps {
  scope: "tasks" | "notes" | "ideas" | "projects"
  allTags: TagResponse[]
  view: string
  defaultView: string
  viewOptions: SelectOption[]
  viewLabel: string
  onViewChange: (view: string) => void
  includeArchived: boolean
  onIncludeArchivedChange: (value: boolean) => void
  showProjectFilter?: boolean
  extraControls?: ReactNode
}

function readPinnedPreference(scope: EntityFilterBarProps["scope"]) {
  return typeof window !== "undefined"
    && window.localStorage.getItem(`todai.${scope}.filters-pinned`) === "true"
}

export function EntityFilterBar({
  scope,
  allTags,
  view,
  defaultView,
  viewOptions,
  viewLabel,
  onViewChange,
  includeArchived,
  onIncludeArchivedChange,
  showProjectFilter = true,
  extraControls,
}: EntityFilterBarProps) {
  const {
    selectedTagIds,
    selectedProjectId,
    clearFilters,
  } = useFilterStore()
  const [isPinned, setIsPinned] = useState(() => readPinnedPreference(scope))
  const [isOpen, setIsOpen] = useState(() => readPinnedPreference(scope))
  const activeCount = selectedTagIds.length
    + Number(showProjectFilter && selectedProjectId !== null)
    + Number(includeArchived)
    + Number(view !== defaultView)
  const panelId = `${scope}-filter-panel`

  const clearAllFilters = () => {
    clearFilters()
    onViewChange(defaultView)
    onIncludeArchivedChange(false)
  }

  const togglePinned = () => {
    const next = !isPinned
    setIsPinned(next)
    setIsOpen(true)
    window.localStorage.setItem(`todai.${scope}.filters-pinned`, String(next))
  }

  return (
    <div className={`tasks-filter${isOpen ? " tasks-filter-open" : ""}${isPinned ? " tasks-filter-pinned" : ""}`}>
      <button
        type="button"
        className="tasks-filter-trigger"
        onClick={() => setIsOpen((current) => isPinned ? true : !current)}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <SlidersHorizontal size={14} strokeWidth={1.8} aria-hidden="true" />
        <span>Filters</span>
        {activeCount > 0 && <span className="tasks-filter-count">{activeCount}</span>}
      </button>

      {isOpen && (
        <div id={panelId} className="tasks-filter-panel">
          <div className="tasks-filter-fields">
            <label className="tasks-filter-view">
              <span>Show</span>
              <SelectDropdown
                value={view}
                options={viewOptions}
                onChange={onViewChange}
                ariaLabel={viewLabel}
                size="compact"
              />
            </label>
            <TagFilterBar allTags={allTags} showProjectFilter={showProjectFilter} />
            {extraControls}
            <button
              type="button"
              className={`tasks-filter-archive${includeArchived ? " is-active" : ""}`}
              onClick={() => onIncludeArchivedChange(!includeArchived)}
              aria-pressed={includeArchived}
            >
              <Archive size={12} strokeWidth={1.8} aria-hidden="true" />
              Archived
            </button>
          </div>

          <div className="tasks-filter-actions">
            {activeCount > 0 && (
              <button type="button" className="tasks-filter-clear" onClick={clearAllFilters}>
                <X size={12} aria-hidden="true" />
                Clear
              </button>
            )}
            <button
              type="button"
              className={`tasks-filter-pin${isPinned ? " is-active" : ""}`}
              onClick={togglePinned}
              aria-pressed={isPinned}
              title={isPinned ? "Unpin filter bar" : "Keep filter bar open"}
            >
              <Pin size={13} strokeWidth={1.8} aria-hidden="true" />
              <span>{isPinned ? "Pinned" : "Pin"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
