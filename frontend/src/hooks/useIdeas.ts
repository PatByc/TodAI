/**
 * TanStack Query hooks for Idea entity operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchIdeas,
  fetchIdea,
  createIdea,
  updateIdea,
  deleteIdea,
  archiveIdea,
  unarchiveIdea,
} from "@/api/ideas"
import type { FetchIdeasParams } from "@/api/ideas"
import type { IdeaCreate, IdeaUpdate } from "@/types/entities"

export function useIdeas(params?: FetchIdeasParams) {
  return useQuery({
    queryKey: ["ideas", params],
    queryFn: () => fetchIdeas(params),
  })
}

export function useIdea(id: number) {
  return useQuery({
    queryKey: ["ideas", id],
    queryFn: () => fetchIdea(id),
    enabled: id > 0,
  })
}

export function useCreateIdea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: IdeaCreate) => createIdea(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ideas"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
      void queryClient.invalidateQueries({ queryKey: ["activity", "transitions"] })
    },
  })
}

export function useUpdateIdea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: IdeaUpdate }) =>
      updateIdea(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["ideas"] })
      void queryClient.invalidateQueries({ queryKey: ["ideas", variables.id] })
      void queryClient.invalidateQueries({ queryKey: ["activity", "transitions"] })
    },
  })
}

export function useDeleteIdea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteIdea(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ideas"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
      void queryClient.invalidateQueries({ queryKey: ["activity", "transitions"] })
    },
  })
}

export function useArchiveIdea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => archiveIdea(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ideas"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
      void queryClient.invalidateQueries({ queryKey: ["activity", "transitions"] })
    },
  })
}

export function useUnarchiveIdea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => unarchiveIdea(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ideas"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
      void queryClient.invalidateQueries({ queryKey: ["activity", "transitions"] })
    },
  })
}
