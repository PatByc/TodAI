const API_BASE = "/api/v1"

import { apiClient } from "@/api/client"

export type BackupFrequency = "off" | "daily" | "weekly"

export interface BackupSettings {
  frequency: BackupFrequency
  retention_count: number
  last_backup_at: string | null
  next_backup_at: string | null
  stored_count: number
  last_error: string | null
}

export interface BackupHistoryItem {
  id: string
  kind: "automatic" | "safety"
  filename: string
  created_at: string
  size_bytes: number
  integrity: "unchecked" | "ok" | "failed"
  verified_at: string | null
  schema_revision: string | null
  needs_upgrade: boolean | null
  verification_error: string | null
}

export interface BackupStorageReport {
  generated_at: string
  total_size_bytes: number
  automatic_size_bytes: number
  safety_size_bytes: number
  verified_count: number
  failed_count: number
  items: BackupHistoryItem[]
}

export interface RestoreCounts {
  tasks: number
  notes: number
  ideas: number
  projects: number
  inbox_items: number
  time_entries: number
}

export interface RestorePreview {
  restore_id: string
  state: "staged" | "confirmed"
  source_name: string
  source_kind: "automatic" | "safety" | "upload"
  created_at: string
  size_bytes: number
  schema_revision: string
  needs_upgrade: boolean
  integrity: "ok"
  counts: RestoreCounts
}

export interface RestoreStatus {
  state: "idle" | "staged" | "confirmed" | "applied" | "failed"
  preview: RestorePreview | null
  message: string | null
  completed_at: string | null
}

export function fetchBackupSettings(): Promise<BackupSettings> {
  return apiClient.get("/backups/settings")
}

export function updateBackupSettings(
  frequency: BackupFrequency,
  retentionCount: number,
): Promise<BackupSettings> {
  return apiClient.put("/backups/settings", {
    frequency,
    retention_count: retentionCount,
  })
}

export function fetchBackupHistory(): Promise<BackupHistoryItem[]> {
  return apiClient.get("/backups/history")
}

export function fetchBackupStorageReport(): Promise<BackupStorageReport> {
  return apiClient.get("/backups/report")
}

export function fetchRestoreStatus(): Promise<RestoreStatus> {
  return apiClient.get("/backups/restore/status")
}

export function stageStoredBackup(backupId: string): Promise<RestorePreview> {
  return apiClient.post(`/backups/${encodeURIComponent(backupId)}/restore/stage`)
}

async function restoreResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(payload?.detail ?? `Restore failed (HTTP ${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function uploadRestoreBackup(file: File): Promise<RestorePreview> {
  const form = new FormData()
  form.append("file", file)
  return restoreResponse(await fetch(`${API_BASE}/backups/restore/upload`, {
    method: "POST",
    body: form,
  }))
}

export function confirmRestore(restoreId: string): Promise<RestoreStatus> {
  return apiClient.post(`/backups/restore/${restoreId}/confirm`, { confirmation: "RESTORE" })
}

export function cancelRestore(restoreId: string): Promise<void> {
  return apiClient.del(`/backups/restore/${restoreId}`)
}

export interface BackupReceipt {
  createdAt: string
  sizeBytes: number
  integrity: "ok"
  filename: string
}

function responseFilename(response: Response): string {
  const disposition = response.headers.get("Content-Disposition") ?? ""
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) return decodeURIComponent(encoded)
  return disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "todai-backup.db"
}

export async function downloadSQLiteBackup(): Promise<BackupReceipt> {
  const response = await fetch(`${API_BASE}/backups/download`, { method: "POST" })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(payload?.detail ?? `Backup failed (HTTP ${response.status})`)
  }

  const blob = await response.blob()
  const filename = responseFilename(response)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)

  return {
    createdAt: response.headers.get("X-TodAI-Backup-Created-At") ?? new Date().toISOString(),
    sizeBytes: Number(response.headers.get("X-TodAI-Backup-Size") ?? blob.size),
    integrity: "ok",
    filename,
  }
}
