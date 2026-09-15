/**
 * TanStack Query hooks for Inbox entity operations.
 * Inbox follows delete-or-convert lifecycle (CAP-01).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchInboxItems,
  createInboxItem,
  deleteInboxItem,
} from "@/api/inbox"
import type { FetchInboxItemsParams } from "@/api/inbox"
import type { InboxItemCreate } from "@/types/entities"

export function useInboxItems(params?: FetchInboxItemsParams) {
  return useQuery({
    queryKey: ["inbox", params],
    queryFn: () => fetchInboxItems(params),
  })
}

export function useCreateInboxItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: InboxItemCreate) => createInboxItem(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inbox"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
    },
  })
}

export function useDeleteInboxItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteInboxItem(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inbox"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
    },
  })
}
