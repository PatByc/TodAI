import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createRoutine,
  createTimeGoal,
  deleteRoutine,
  deleteTimeGoal,
  fetchRoutines,
  fetchTimeGoals,
  setRoutineCompletion,
  updateRoutine,
  updateTimeGoal,
} from "@/api/planning"
import type { RoutineCompletionUpdate, RoutineCreate, RoutineUpdate, TimeGoalCreate, TimeGoalUpdate } from "@/types/entities"

const routineKey = ["plan", "routines"] as const
const goalKey = ["plan", "goals"] as const

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
