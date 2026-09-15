/**
 * TanStack Query mutation hooks for entity conversion.
 * Handles inbox-to-entity and idea-to-entity conversions.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { convertInboxItem } from "@/api/inbox"
import { convertIdea } from "@/api/ideas"

/** Map target_type to its TanStack Query cache key */
function targetQueryKey(targetType: string): string {
  switch (targetType) {
    case "note":
      return "notes"
    case "task":
      return "tasks"
    case "idea":
      return "ideas"
    case "project":
      return "projects"
    default:
      return targetType + "s"
  }
}

export function useConvertInbox() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, targetType }: { id: number; targetType: string }) =>
      convertInboxItem(id, targetType),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["inbox"] })
      void queryClient.invalidateQueries({ queryKey: [targetQueryKey(variables.targetType)] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
    },
  })
}

export function useConvertIdea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, targetType }: { id: number; targetType: string }) =>
      convertIdea(id, targetType),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["ideas"] })
      void queryClient.invalidateQueries({ queryKey: [targetQueryKey(variables.targetType)] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
    },
  })
}
