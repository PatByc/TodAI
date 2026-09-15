/**
 * TanStack Query hooks for Project entity operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
  archiveProject,
  unarchiveProject,
} from "@/api/projects"
import type { FetchProjectsParams } from "@/api/projects"
import type { ProjectCreate, ProjectUpdate } from "@/types/entities"

export function useProjects(params?: FetchProjectsParams) {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: () => fetchProjects(params),
  })
}

export function useProject(id: number) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => fetchProject(id),
    enabled: id > 0,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ProjectCreate) => createProject(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProjectUpdate }) =>
      updateProject(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] })
      void queryClient.invalidateQueries({ queryKey: ["projects", variables.id] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
    },
  })
}

export function useArchiveProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => archiveProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
    },
  })
}

export function useUnarchiveProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => unarchiveProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
    },
  })
}
