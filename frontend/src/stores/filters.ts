/**
 * Zustand store for tag filter state.
 * Used by entity list views to filter by tags with AND/OR logic.
 */

import { create } from "zustand"

interface FilterState {
  selectedTagIds: number[]
  tagLogic: "and" | "or"
  selectedProjectId: number | null
  toggleTag: (id: number) => void
  clearTags: () => void
  setTagLogic: (logic: "and" | "or") => void
  setSelectedProjectId: (id: number | null) => void
  clearFilters: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedTagIds: [],
  tagLogic: "and",
  selectedProjectId: null,

  toggleTag: (id: number) =>
    set((state) => ({
      selectedTagIds: state.selectedTagIds.includes(id)
        ? state.selectedTagIds.filter((tagId) => tagId !== id)
        : [...state.selectedTagIds, id],
    })),

  clearTags: () => set({ selectedTagIds: [], tagLogic: "and" }),

  setTagLogic: (logic: "and" | "or") =>
    set({ tagLogic: logic }),

  setSelectedProjectId: (id: number | null) =>
    set({ selectedProjectId: id }),

  clearFilters: () =>
    set({ selectedTagIds: [], tagLogic: "and", selectedProjectId: null }),
}))
