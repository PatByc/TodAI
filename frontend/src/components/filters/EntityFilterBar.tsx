import { Archive, SlidersHorizontal, X } from "lucide-react"
import { useState } from "react"
import type { ReactNode } from "react"
import { TagFilterBar } from "@/components/tags/TagFilterBar"
import { SelectDropdown } from "@/components/ui/SelectDropdown"
import { useFilterStore } from "@/stores/filters"
import type { SelectOption } from "@/components/ui/SelectDropdown"
import type { TagResponse } from "@/types/entities"
import type { FilterScope } from "@/stores/filters"

interface EntityFilterBarProps {
  scope: FilterScope
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

function readOpenPreference(scope: EntityFilterBarProps["scope"]) {
  if (typeof window === "undefined") return false
  const stored = window.localStorage.getItem(`todai.${scope}.filters-open`)
  if (stored !== null) return stored === "true"
  return window.localStorage.getItem(`todai.${scope}.filters-pinned`) === "true"
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
  const selectedTagIds = useFilterStore((state) => state.byScope[scope].selectedTagIds)
  const selectedProjectId = useFilterStore((state) => state.byScope[scope].selectedProjectId)
  const clearFilters = useFilterStore((state) => state.clearFilters)
  const [isOpen, setIsOpen] = useState(() => readOpenPreference(scope))
  const activeCount = selectedTagIds.length
    + Number(showProjectFilter && selectedProjectId !== null)
    + Number(includeArchived)
    + Number(view !== defaultView)
  const panelId = `${scope}-filter-panel`

  const clearAllFilters = () => {
    clearFilters(scope)
    onViewChange(defaultView)
    onIncludeArchivedChange(false)
  }

  const toggleFilters = () => {
    const next = !isOpen
    setIsOpen(next)
    window.localStorage.setItem(`todai.${scope}.filters-open`, String(next))
  }

  return (
    <div className={`tasks-filter${isOpen ? " tasks-filter-open" : ""}`}>
      <button
        type="button"
        className={`tasks-filter-trigger${isOpen ? " is-active" : ""}`}
        onClick={toggleFilters}
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
            <TagFilterBar scope={scope} allTags={allTags} showProjectFilter={showProjectFilter} />
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
            <button
              type="button"
              className="tasks-filter-clear"
              onClick={clearAllFilters}
              disabled={activeCount === 0}
              aria-label={activeCount === 0 ? "No filters to clear" : "Clear filters"}
            >
              <X size={12} aria-hidden="true" />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
