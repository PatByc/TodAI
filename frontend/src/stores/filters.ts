/**
 * Zustand store for tag filter state.
 * Used by entity list views to filter by tags with AND/OR logic.
 */

import { create } from "zustand"

interface FilterState {
  selectedTagIds: number[]
  tagLogic: "and" | "or"
  includeArchived: boolean
  toggleTag: (id: number) => void
  setTagLogic: (logic: "and" | "or") => void
  setIncludeArchived: (value: boolean) => void
  clearFilters: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedTagIds: [],
  tagLogic: "and",
  includeArchived: false,

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

  clearFilters: () =>
    set({ selectedTagIds: [], tagLogic: "and", includeArchived: false }),
}))
