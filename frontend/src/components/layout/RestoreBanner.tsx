import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { RotateCcw, ShieldCheck } from "lucide-react"
import { cancelRestore, fetchRestoreStatus, type RestoreStatus } from "@/api/backups"

export function RestoreBanner() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ["restore-status"],
    queryFn: fetchRestoreStatus,
    refetchInterval: 5_000,
  })
  const cancel = useMutation({
    mutationFn: cancelRestore,
    onSuccess: () => queryClient.setQueryData<RestoreStatus>(["restore-status"], {
      state: "idle",
      preview: null,
      message: null,
      completed_at: null,
    }),
  })
  const preview = query.data?.state === "confirmed" ? query.data.preview : null
  if (!preview) return null

  return (
    <div className="restore-banner" role="status">
      <ShieldCheck size={14} />
      <span><strong>Restore ready.</strong> Restart TodAI to apply {preview.source_name}.</span>
      <button type="button" onClick={() => cancel.mutate(preview.restore_id)} disabled={cancel.isPending}>
        <RotateCcw size={12} /> Cancel
      </button>
    </div>
  )
}
