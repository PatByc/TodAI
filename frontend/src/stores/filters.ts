/**
 * Zustand store for tag filter state.
 * Used by entity list views to filter by tags with AND/OR logic.
 */

import { create } from "zustand"

interface FilterState {
  selectedTagIds: number[]
  tagLogic: "and" | "or"
  includeArchived: boolean
  selectedProjectId: number | null
  toggleTag: (id: number) => void
  setTagLogic: (logic: "and" | "or") => void
  setIncludeArchived: (value: boolean) => void
  setSelectedProjectId: (id: number | null) => void
  clearFilters: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedTagIds: [],
  tagLogic: "and",
  includeArchived: false,
  selectedProjectId: null,

  toggleTag: (id: number) =>
    set((state) => ({
      selectedTagIds: state.selectedTagIds.includes(id)
        ? state.selectedTagIds.filter((tagId) => tagId !== id)
        : [...state.selectedTagIds, id],
    })),

  setTagLogic: (logic: "and" | "or") =>
    set({ tagLogic: logic }),

  setIncludeArchived: (value: boolean) =>
    set({ includeArchived: value }),

  setSelectedProjectId: (id: number | null) =>
    set({ selectedProjectId: id }),

  clearFilters: () =>
    set({ selectedTagIds: [], tagLogic: "and", includeArchived: false, selectedProjectId: null }),
}))
