import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createTimeCategory,
  createTimeStream,
  fetchActiveTimer,
  fetchTimeStreams,
  startTimer,
  stopTimer,
  updateTimeCategory,
  updateTimeStream,
} from "@/api/timeTracking"
import type {
  TimeCategoryCreate,
  TimeCategoryUpdate,
  TimeStreamCreate,
  TimeStreamUpdate,
  TimerStart,
} from "@/types/entities"

const queryKey = ["time", "streams"] as const
const timerQueryKey = ["time", "timer"] as const

export function useActiveTimer() {
  return useQuery({
    queryKey: timerQueryKey,
    queryFn: fetchActiveTimer,
    refetchInterval: 5000,
  })
}

export function useStartTimer() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (data: TimerStart = {}) => startTimer(data),
    onSuccess: (entry) => client.setQueryData(timerQueryKey, entry),
  })
}

export function useStopTimer() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: stopTimer,
    onSuccess: () => client.setQueryData(timerQueryKey, null),
  })
}

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
