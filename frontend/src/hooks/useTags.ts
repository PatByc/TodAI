/**
 * TanStack Query hooks for Tag operations.
 * Search tags has enabled: query.length >= 2 per RESEARCH Pitfall 6.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchTags,
  searchTags,
  createTag,
  deleteTag,
  updateTagColor,
  addTagToEntity,
  removeTagFromEntity,
  getEntityTags,
} from "@/api/tags"

export function useFetchAllTags() {
  return useQuery({
    queryKey: ["tags", "list"],
    queryFn: fetchTags,
  })
}

export function useSearchTags(query: string) {
  return useQuery({
    queryKey: ["tags", "search", query],
    queryFn: () => searchTags(query),
    enabled: query.length >= 2,
  })
}

export function useEntityTags(entityType: string, entityId: number) {
  return useQuery({
    queryKey: ["tags", entityType, entityId],
    queryFn: () => getEntityTags(entityType, entityId),
    enabled: entityId > 0,
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (value: string | { name: string; color_index: number }) => typeof value === "string"
      ? createTag(value)
      : createTag(value.name, value.color_index),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags"] })
    },
  })
}

export function useUpdateTagColor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tagId, colorIndex }: { tagId: number; colorIndex: number }) => updateTagColor(tagId, colorIndex),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags"] })
      for (const key of ["notes", "tasks", "ideas", "projects", "inbox"]) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tagId: number) => deleteTag(tagId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags"] })
      for (const key of ["notes", "tasks", "ideas", "projects", "inbox"]) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}

export function useAddTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      tagId,
      entityType,
      entityId,
    }: {
      tagId: number
      entityType: string
      entityId: number
    }) => addTagToEntity(tagId, entityType, entityId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["tags", variables.entityType, variables.entityId],
      })
      // Invalidate the entity list to refresh tag badges
      void queryClient.invalidateQueries({
        queryKey: [variables.entityType === "note" ? "notes" : variables.entityType === "task" ? "tasks" : "ideas"],
      })
    },
  })
}

export function useRemoveTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      tagId,
      entityType,
      entityId,
    }: {
      tagId: number
      entityType: string
      entityId: number
    }) => removeTagFromEntity(tagId, entityType, entityId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["tags", variables.entityType, variables.entityId],
      })
      void queryClient.invalidateQueries({
        queryKey: [variables.entityType === "note" ? "notes" : variables.entityType === "task" ? "tasks" : "ideas"],
      })
    },
  })
}
