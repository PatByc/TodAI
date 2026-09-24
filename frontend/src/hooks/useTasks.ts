/**
 * TanStack Query hooks for Task entity operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchTasks,
  fetchTask,
  createTask,
  updateTask,
  deleteTask,
  archiveTask,
  unarchiveTask,
} from "@/api/tasks"
import type { FetchTasksParams } from "@/api/tasks"
import type { TaskCreate, TaskUpdate } from "@/types/entities"
import { useFilterStore } from "@/stores/filters"

export function useTasks(params?: FetchTasksParams) {
  const selectedProjectId = useFilterStore((s) => s.selectedProjectId)
  const mergedParams = {
    ...params,
    project_id: params?.project_id ?? selectedProjectId ?? undefined,
  }
  return useQuery({
    queryKey: ["tasks", mergedParams],
    queryFn: () => fetchTasks(mergedParams),
  })
}

export function useTask(id: number) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: () => fetchTask(id),
    enabled: id > 0,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskCreate) => createTask(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
      void queryClient.invalidateQueries({ queryKey: ["activity", "transitions"] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaskUpdate }) =>
      updateTask(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] })
      void queryClient.invalidateQueries({ queryKey: ["tasks", variables.id] })
      void queryClient.invalidateQueries({ queryKey: ["today", "tasks"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
      void queryClient.invalidateQueries({ queryKey: ["activity", "transitions"] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
      void queryClient.invalidateQueries({ queryKey: ["activity", "transitions"] })
    },
  })
}

export function useArchiveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => archiveTask(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
      void queryClient.invalidateQueries({ queryKey: ["activity", "transitions"] })
    },
  })
}

export function useUnarchiveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => unarchiveTask(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
      void queryClient.invalidateQueries({ queryKey: ["activity", "transitions"] })
    },
  })
}
