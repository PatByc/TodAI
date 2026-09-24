import { apiClient, buildQueryString } from "./client"
import type {
  Routine,
  RoutineCompletionUpdate,
  RoutineCreate,
  RoutineUpdate,
  TimeGoal,
  TimeGoalCreate,
  TimeGoalUpdate,
} from "@/types/entities"

export function fetchRoutines(includeInactive = true): Promise<Routine[]> {
  return apiClient.get<Routine[]>(`/plan/routines${buildQueryString({ include_inactive: includeInactive })}`)
}

export function createRoutine(data: RoutineCreate): Promise<Routine> {
  return apiClient.post<Routine>("/plan/routines", data)
}

export function updateRoutine(id: number, data: RoutineUpdate): Promise<Routine> {
  return apiClient.put<Routine>(`/plan/routines/${id}`, data)
}

export function deleteRoutine(id: number): Promise<void> {
  return apiClient.del<void>(`/plan/routines/${id}`)
}

export function setRoutineCompletion(id: number, data: RoutineCompletionUpdate): Promise<Routine> {
  return apiClient.put<Routine>(`/plan/routines/${id}/completion`, data)
}

export function fetchTimeGoals(includeInactive = true): Promise<TimeGoal[]> {
  return apiClient.get<TimeGoal[]>(`/plan/goals${buildQueryString({ include_inactive: includeInactive })}`)
}

export function createTimeGoal(data: TimeGoalCreate): Promise<TimeGoal> {
  return apiClient.post<TimeGoal>("/plan/goals", data)
}

export function updateTimeGoal(id: number, data: TimeGoalUpdate): Promise<TimeGoal> {
  return apiClient.put<TimeGoal>(`/plan/goals/${id}`, data)
}

export function deleteTimeGoal(id: number): Promise<void> {
  return apiClient.del<void>(`/plan/goals/${id}`)
}
