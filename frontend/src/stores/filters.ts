/** Page-scoped, persisted entity-list filters. */

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type FilterScope = "tasks" | "notes" | "ideas" | "projects"

interface ScopeFilters {
  selectedTagIds: number[]
  tagLogic: "and" | "or"
  selectedProjectId: number | null
}

interface FilterState {
  byScope: Record<FilterScope, ScopeFilters>
  toggleTag: (scope: FilterScope, id: number) => void
  clearTags: (scope: FilterScope) => void
  setTagLogic: (scope: FilterScope, logic: "and" | "or") => void
  setSelectedProjectId: (scope: FilterScope, id: number | null) => void
  clearFilters: (scope: FilterScope) => void
}

const emptyScope = (): ScopeFilters => ({
  selectedTagIds: [],
  tagLogic: "and",
  selectedProjectId: null,
})

const initialScopes = (): Record<FilterScope, ScopeFilters> => ({
  tasks: emptyScope(),
  notes: emptyScope(),
  ideas: emptyScope(),
  projects: emptyScope(),
})

export const useFilterStore = create<FilterState>()(persist(
  (set) => ({
    byScope: initialScopes(),

    toggleTag: (scope, id) => set((state) => {
      const current = state.byScope[scope]
      return {
        byScope: {
          ...state.byScope,
          [scope]: {
            ...current,
            selectedTagIds: current.selectedTagIds.includes(id)
              ? current.selectedTagIds.filter((tagId) => tagId !== id)
              : [...current.selectedTagIds, id],
          },
        },
      }
    }),

    clearTags: (scope) => set((state) => ({
      byScope: {
        ...state.byScope,
        [scope]: { ...state.byScope[scope], selectedTagIds: [], tagLogic: "and" },
      },
    })),

    setTagLogic: (scope, tagLogic) => set((state) => ({
      byScope: {
        ...state.byScope,
        [scope]: { ...state.byScope[scope], tagLogic },
      },
    })),

    setSelectedProjectId: (scope, selectedProjectId) => set((state) => ({
      byScope: {
        ...state.byScope,
        [scope]: { ...state.byScope[scope], selectedProjectId },
      },
    })),

    clearFilters: (scope) => set((state) => ({
      byScope: { ...state.byScope, [scope]: emptyScope() },
    })),
  }),
  {
    name: "todai.entity-filters.v1",
    storage: createJSONStorage(() => window.localStorage),
    partialize: (state) => ({ byScope: state.byScope }),
    merge: (persisted, current) => {
      const saved = (persisted as Partial<FilterState> | undefined)?.byScope
      return {
        ...current,
        byScope: {
          ...current.byScope,
          ...saved,
        },
      }
    },
  },
))
