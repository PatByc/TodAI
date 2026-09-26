import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Database,
  FileUp,
  HardDrive,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"
import {
  cancelRestore,
  confirmRestore,
  fetchBackupStorageReport,
  fetchRestoreStatus,
  stageStoredBackup,
  uploadRestoreBackup,
  type RestorePreview,
  type RestoreStatus,
} from "@/api/backups"

function sizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

const COUNT_LABELS: Array<[keyof RestorePreview["counts"], string]> = [
  ["tasks", "Tasks"],
  ["notes", "Notes"],
  ["ideas", "Ideas"],
  ["projects", "Projects"],
  ["inbox_items", "Inbox"],
  ["time_entries", "Time entries"],
]

export function RestorePanel() {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const statusQuery = useQuery({
    queryKey: ["restore-status"],
    queryFn: fetchRestoreStatus,
    refetchInterval: 5_000,
  })
  const historyQuery = useQuery({
    queryKey: ["backup-storage-report"],
    queryFn: fetchBackupStorageReport,
  })
  const setStaged = (preview: RestorePreview) => {
    queryClient.setQueryData<RestoreStatus>(["restore-status"], {
      state: "staged",
      preview,
      message: null,
      completed_at: null,
    })
    setConfirmation("")
    setOpen(true)
  }
  const storedStage = useMutation({ mutationFn: stageStoredBackup, onSuccess: setStaged })
  const uploadStage = useMutation({ mutationFn: uploadRestoreBackup, onSuccess: setStaged })
  const confirm = useMutation({
    mutationFn: confirmRestore,
    onSuccess: (next) => queryClient.setQueryData(["restore-status"], next),
  })
  const cancel = useMutation({
    mutationFn: cancelRestore,
    onSuccess: () => {
      queryClient.setQueryData<RestoreStatus>(["restore-status"], {
        state: "idle",
        preview: null,
        message: null,
        completed_at: null,
      })
      setConfirmation("")
    },
  })
  const restoreStatus = statusQuery.data
  const preview = restoreStatus?.preview
  const pending = storedStage.isPending || uploadStage.isPending
  const error = storedStage.error || uploadStage.error || confirm.error || cancel.error

  useEffect(() => {
    if (restoreStatus?.state === "staged" || restoreStatus?.state === "confirmed") {
      setOpen(true)
    }
  }, [restoreStatus?.state])

  const chooseFile = async (file: File | undefined) => {
    if (!file) return
    await uploadStage.mutateAsync(file)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className={`restore-panel${open ? " is-open" : ""}`} id="restore">
      <button
        type="button"
        className="restore-panel-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span><RotateCcw size={14} /> Restore backup</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {open && (
        <div className="restore-panel-body">
          {restoreStatus?.state === "confirmed" && preview ? (
            <div className="restore-confirmed">
              <ShieldCheck size={19} />
              <div>
                <strong>Restore ready</strong>
                <span>Restart TodAI to apply {preview.source_name}. Workspace changes are temporarily locked.</span>
              </div>
              <button type="button" onClick={() => cancel.mutate(preview.restore_id)} disabled={cancel.isPending}>Cancel restore</button>
            </div>
          ) : restoreStatus?.state === "staged" && preview ? (
            <div className="restore-preview">
              <div className="restore-preview-head">
                <span><ShieldCheck size={15} /> Verified backup</span>
                <button type="button" onClick={() => cancel.mutate(preview.restore_id)} disabled={cancel.isPending}>Choose another</button>
              </div>
              <div className="restore-preview-source">
                <Database size={17} />
                <div><strong>{preview.source_name}</strong><span>{sizeLabel(preview.size_bytes)} · schema {preview.schema_revision}{preview.needs_upgrade ? " · upgrade required" : ""}</span></div>
              </div>
              <div className="restore-counts">
                {COUNT_LABELS.map(([key, label]) => <div key={key}><strong>{preview.counts[key]}</strong><span>{label}</span></div>)}
              </div>
              <div className="restore-warning">
                <AlertTriangle size={15} />
                <span>The current workspace will be kept as a safety copy. Type <strong>RESTORE</strong> to continue.</span>
              </div>
              <div className="restore-confirm-row">
                <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Type RESTORE" aria-label="Type RESTORE to confirm" />
                <button type="button" onClick={() => confirm.mutate(preview.restore_id)} disabled={confirmation !== "RESTORE" || confirm.isPending}>
                  {confirm.isPending ? <Loader2 className="export-spinner" size={13} /> : <RotateCcw size={13} />}
                  Confirm restore
                </button>
              </div>
            </div>
          ) : (
            <>
              {(restoreStatus?.state === "applied" || restoreStatus?.state === "failed") && (
                <div className={`restore-result is-${restoreStatus.state}`}>
                  {restoreStatus.state === "applied" ? <Check size={13} /> : <AlertTriangle size={13} />}
                  <span>{restoreStatus.message}</span>
                </div>
              )}
              <div className="restore-source-head"><strong>Choose a backup</strong><span>It will be checked before anything changes.</span></div>
              {historyQuery.data && (
                <div className={`backup-storage-summary${historyQuery.data.failed_count ? " has-failures" : ""}`}>
                  <HardDrive size={14} />
                  <div><strong>{sizeLabel(historyQuery.data.total_size_bytes)}</strong><span>{historyQuery.data.items.length} stored · {sizeLabel(historyQuery.data.automatic_size_bytes)} automatic · {sizeLabel(historyQuery.data.safety_size_bytes)} safety</span></div>
                  <span>{historyQuery.data.failed_count ? `${historyQuery.data.failed_count} failed` : `${historyQuery.data.verified_count} verified`}</span>
                </div>
              )}
              <div className="restore-history">
                {historyQuery.isLoading ? <span className="restore-empty">Verifying stored backups…</span> : historyQuery.data?.items.length ? historyQuery.data.items.map((item) => (
                  <div key={item.id} className={`restore-history-row is-${item.integrity}`}>
                    <span className={`restore-kind is-${item.kind}`}>{item.kind === "safety" ? "Safety" : "Auto"}</span>
                    <div><strong>{dateLabel(item.created_at)}</strong><span title={item.verification_error ?? undefined}>{sizeLabel(item.size_bytes)} · {item.integrity === "ok" ? `verified · schema ${item.schema_revision}` : "verification failed"}</span></div>
                    <button type="button" onClick={() => storedStage.mutate(item.id)} disabled={pending || item.integrity === "failed"}>{item.integrity === "failed" ? "Invalid" : "Inspect"}</button>
                  </div>
                )) : historyQuery.isError ? <span className="restore-empty is-error">Could not inspect stored backups.</span> : <span className="restore-empty">No stored backups yet.</span>}
              </div>
              <input ref={inputRef} hidden type="file" accept=".db,.sqlite,.sqlite3" onChange={(event) => void chooseFile(event.target.files?.[0])} />
              <button type="button" className="restore-upload" onClick={() => inputRef.current?.click()} disabled={pending}>
                {uploadStage.isPending ? <Loader2 className="export-spinner" size={14} /> : <FileUp size={14} />}
                {uploadStage.isPending ? "Checking backup…" : "Upload a backup"}
              </button>
            </>
          )}
          {error && <p className="restore-error" role="alert">{error.message}</p>}
        </div>
      )}
    </div>
  )
}
