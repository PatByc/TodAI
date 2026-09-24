import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createTimeCategory,
  createTimeStream,
  fetchTimeStreams,
  updateTimeCategory,
  updateTimeStream,
} from "@/api/timeTracking"
import type {
  TimeCategoryCreate,
  TimeCategoryUpdate,
  TimeStreamCreate,
  TimeStreamUpdate,
} from "@/types/entities"

const queryKey = ["time", "streams"] as const

export function useTimeStreams() {
  return useQuery({ queryKey, queryFn: () => fetchTimeStreams(true) })
}

export function useCreateTimeStream() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (data: TimeStreamCreate) => createTimeStream(data),
    onSuccess: () => client.invalidateQueries({ queryKey }),
  })
}

export function useUpdateTimeStream() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TimeStreamUpdate }) => updateTimeStream(id, data),
    onSuccess: () => client.invalidateQueries({ queryKey }),
  })
}

export function useCreateTimeCategory() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (data: TimeCategoryCreate) => createTimeCategory(data),
    onSuccess: () => client.invalidateQueries({ queryKey }),
  })
}

export function useUpdateTimeCategory() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TimeCategoryUpdate }) => updateTimeCategory(id, data),
    onSuccess: () => client.invalidateQueries({ queryKey }),
  })
}
