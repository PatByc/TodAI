import { useState } from "react"
import { Check, DatabaseBackup, Loader2 } from "lucide-react"
import { downloadSQLiteBackup, type BackupReceipt } from "@/api/backups"

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function BackupButton() {
  const [receipt, setReceipt] = useState<BackupReceipt | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createBackup = async () => {
    if (running) return
    setRunning(true)
    setError(null)
    try {
      setReceipt(await downloadSQLiteBackup())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Backup failed")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="backup-control">
      <button type="button" className="backup-trigger" onClick={() => void createBackup()} disabled={running}>
        {running ? <Loader2 className="export-spinner" size={14} /> : <DatabaseBackup size={14} />}
        {running ? "Creating…" : "Create backup"}
      </button>
      {receipt && !error && (
        <span className="backup-receipt" title={receipt.filename}>
          <Check size={11} strokeWidth={2.4} aria-hidden="true" />
          Verified · {sizeLabel(receipt.sizeBytes)} · {timeLabel(receipt.createdAt)}
        </span>
      )}
      {error && <span className="backup-error" role="alert">{error}</span>}
    </div>
  )
}
