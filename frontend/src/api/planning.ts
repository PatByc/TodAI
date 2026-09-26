import { apiClient, buildQueryString } from "./client"
import type {
  MetricGoal,
  MetricGoalCreate,
  MetricGoalUpdate,
  MetricProgress,
  MetricProgressCreate,
  PlannedBlock,
  PlannedBlockCreate,
  PlannedBlockUpdate,
  Routine,
  RoutineCompletionUpdate,
  RoutineCreate,
  RoutineUpdate,
  TimeGoal,
  TimeGoalCreate,
  TimeGoalUpdate,
} from "@/types/entities"

export function fetchPlannedBlocks(fromAt: string, toAt: string): Promise<PlannedBlock[]> {
  return apiClient.get<PlannedBlock[]>(`/plan/blocks${buildQueryString({ from_at: fromAt, to_at: toAt })}`)
}

export function createPlannedBlock(data: PlannedBlockCreate): Promise<PlannedBlock> {
  return apiClient.post<PlannedBlock>("/plan/blocks", data)
}

export function updatePlannedBlock(id: number, data: PlannedBlockUpdate): Promise<PlannedBlock> {
  return apiClient.put<PlannedBlock>(`/plan/blocks/${id}`, data)
}

export function deletePlannedBlock(id: number): Promise<void> {
  return apiClient.del<void>(`/plan/blocks/${id}`)
}

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

export function fetchMetricGoals(includeInactive = true, onDate?: string): Promise<MetricGoal[]> {
  return apiClient.get<MetricGoal[]>(`/plan/metric-goals${buildQueryString({ include_inactive: includeInactive, on_date: onDate })}`)
}

export function createMetricGoal(data: MetricGoalCreate): Promise<MetricGoal> {
  return apiClient.post<MetricGoal>("/plan/metric-goals", data)
}

export function updateMetricGoal(id: number, data: MetricGoalUpdate): Promise<MetricGoal> {
  return apiClient.put<MetricGoal>(`/plan/metric-goals/${id}`, data)
}

export function deleteMetricGoal(id: number): Promise<void> {
  return apiClient.del<void>(`/plan/metric-goals/${id}`)
}

export function recordMetricProgress(id: number, data: MetricProgressCreate): Promise<MetricProgress> {
  return apiClient.post<MetricProgress>(`/plan/metric-goals/${id}/progress`, data)
}
