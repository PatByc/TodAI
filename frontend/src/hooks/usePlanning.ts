import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createMetricGoal,
  createPlannedBlock,
  createRoutine,
  createTimeGoal,
  deleteMetricGoal,
  deletePlannedBlock,
  deleteRoutine,
  deleteTimeGoal,
  fetchMetricGoals,
  fetchPlannedBlocks,
  fetchRoutines,
  fetchTimeGoals,
  recordMetricProgress,
  setRoutineCompletion,
  updatePlannedBlock,
  updateRoutine,
  updateTimeGoal,
  updateMetricGoal,
} from "@/api/planning"
import type { MetricGoalCreate, MetricGoalUpdate, MetricProgressCreate, PlannedBlockCreate, PlannedBlockUpdate, RoutineCompletionUpdate, RoutineCreate, RoutineUpdate, TimeGoalCreate, TimeGoalUpdate } from "@/types/entities"

const routineKey = ["plan", "routines"] as const
const goalKey = ["plan", "goals"] as const
const metricGoalKey = ["plan", "metric-goals"] as const
const blockKey = ["plan", "blocks"] as const

export function usePlannedBlocks(fromAt: string, toAt: string) {
  return useQuery({ queryKey: [...blockKey, fromAt, toAt], queryFn: () => fetchPlannedBlocks(fromAt, toAt) })
}

export function useCreatePlannedBlock() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (data: PlannedBlockCreate) => createPlannedBlock(data), onSuccess: () => client.invalidateQueries({ queryKey: blockKey }) })
}

export function useUpdatePlannedBlock() {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: PlannedBlockUpdate }) => updatePlannedBlock(id, data), onSuccess: () => client.invalidateQueries({ queryKey: blockKey }) })
}

export function useDeletePlannedBlock() {
  const client = useQueryClient()
  return useMutation({ mutationFn: deletePlannedBlock, onSuccess: () => client.invalidateQueries({ queryKey: blockKey }) })
}

export function useRoutines(includeInactive = true) {
  return useQuery({ queryKey: [...routineKey, includeInactive], queryFn: () => fetchRoutines(includeInactive) })
}

export function useCreateRoutine() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (data: RoutineCreate) => createRoutine(data), onSuccess: () => client.invalidateQueries({ queryKey: routineKey }) })
}

export function useUpdateRoutine() {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: RoutineUpdate }) => updateRoutine(id, data), onSuccess: () => client.invalidateQueries({ queryKey: routineKey }) })
}

export function useDeleteRoutine() {
  const client = useQueryClient()
  return useMutation({ mutationFn: deleteRoutine, onSuccess: () => client.invalidateQueries({ queryKey: routineKey }) })
}

export function useSetRoutineCompletion() {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: RoutineCompletionUpdate }) => setRoutineCompletion(id, data), onSuccess: () => client.invalidateQueries({ queryKey: routineKey }) })
}

export function useTimeGoals(includeInactive = true) {
  return useQuery({ queryKey: [...goalKey, includeInactive], queryFn: () => fetchTimeGoals(includeInactive) })
}

export function useCreateTimeGoal() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (data: TimeGoalCreate) => createTimeGoal(data), onSuccess: () => client.invalidateQueries({ queryKey: goalKey }) })
}

export function useUpdateTimeGoal() {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: TimeGoalUpdate }) => updateTimeGoal(id, data), onSuccess: () => client.invalidateQueries({ queryKey: goalKey }) })
}

export function useDeleteTimeGoal() {
  const client = useQueryClient()
  return useMutation({ mutationFn: deleteTimeGoal, onSuccess: () => client.invalidateQueries({ queryKey: goalKey }) })
}

export function useMetricGoals(includeInactive = true, onDate?: string) {
  return useQuery({ queryKey: [...metricGoalKey, includeInactive, onDate], queryFn: () => fetchMetricGoals(includeInactive, onDate) })
}

export function useCreateMetricGoal() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (data: MetricGoalCreate) => createMetricGoal(data), onSuccess: () => client.invalidateQueries({ queryKey: metricGoalKey }) })
}

export function useUpdateMetricGoal() {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: MetricGoalUpdate }) => updateMetricGoal(id, data), onSuccess: () => client.invalidateQueries({ queryKey: metricGoalKey }) })
}

export function useDeleteMetricGoal() {
  const client = useQueryClient()
  return useMutation({ mutationFn: deleteMetricGoal, onSuccess: () => client.invalidateQueries({ queryKey: metricGoalKey }) })
}

export function useRecordMetricProgress() {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: MetricProgressCreate }) => recordMetricProgress(id, data), onSuccess: () => client.invalidateQueries({ queryKey: metricGoalKey }) })
}
