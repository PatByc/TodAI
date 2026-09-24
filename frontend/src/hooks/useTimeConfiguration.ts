import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createTimeCategory,
  createTimeEntry,
  createTimeStream,
  deleteTimeEntry,
  fetchActiveTimer,
  fetchTimeEntries,
  fetchTimeStreams,
  startTimer,
  stopTimer,
  updateTimeCategory,
  updateTimeEntry,
  updateTimeStream,
} from "@/api/timeTracking"
import type {
  TimeCategoryCreate,
  TimeCategoryUpdate,
  TimeEntryCreate,
  TimeEntryUpdate,
  TimeStreamCreate,
  TimeStreamUpdate,
  TimerStart,
} from "@/types/entities"

const queryKey = ["time", "streams"] as const
const timerQueryKey = ["time", "timer"] as const
const entriesQueryKey = ["time", "entries"] as const

export function useTimeEntries() {
  return useQuery({ queryKey: entriesQueryKey, queryFn: fetchTimeEntries })
}

export function useCreateTimeEntry() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (data: TimeEntryCreate) => createTimeEntry(data),
    onSuccess: () => void client.invalidateQueries({ queryKey: entriesQueryKey }),
  })
}

export function useUpdateTimeEntry() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TimeEntryUpdate }) => updateTimeEntry(id, data),
    onSuccess: () => void client.invalidateQueries({ queryKey: entriesQueryKey }),
  })
}

export function useDeleteTimeEntry() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteTimeEntry(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: entriesQueryKey }),
  })
}

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
    onSuccess: (entry) => {
      client.setQueryData(timerQueryKey, entry)
      void client.invalidateQueries({ queryKey: entriesQueryKey })
    },
  })
}

export function useStopTimer() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: stopTimer,
    onSuccess: () => {
      client.setQueryData(timerQueryKey, null)
      void client.invalidateQueries({ queryKey: entriesQueryKey })
    },
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
