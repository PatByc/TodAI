import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Check, Clock3 } from "lucide-react"
import {
  fetchBackupSettings,
  updateBackupSettings,
  type BackupFrequency,
  type BackupSettings as BackupSettingsValue,
} from "@/api/backups"
import { SelectDropdown } from "@/components/ui/SelectDropdown"

const FREQUENCY_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
]

const RETENTION_OPTIONS = [1, 3, 5, 7, 10, 20, 30].map((count) => ({
  value: String(count),
  label: `Last ${count}`,
}))

function dateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function statusLabel(settings: BackupSettingsValue): string {
  if (settings.frequency === "off") {
    return `${settings.stored_count} stored · automatic backups off`
  }
  if (settings.last_backup_at) {
    const next = settings.next_backup_at ? ` · next ${dateTimeLabel(settings.next_backup_at)}` : ""
    return `${settings.stored_count} stored · last ${dateTimeLabel(settings.last_backup_at)}${next}`
  }
  return "Waiting for the first automatic backup…"
}

export function BackupSettings() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ["backup-settings"],
    queryFn: fetchBackupSettings,
    refetchInterval: (current) => current.state.data?.frequency === "off" ? 30_000 : 5_000,
  })
  const mutation = useMutation({
    mutationFn: ({ frequency, retentionCount }: { frequency: BackupFrequency; retentionCount: number }) => (
      updateBackupSettings(frequency, retentionCount)
    ),
    onSuccess: (next) => queryClient.setQueryData(["backup-settings"], next),
  })

  const settings = query.data
  if (query.isLoading) return <span className="backup-schedule-state">Loading…</span>
  if (!settings || query.isError) return <span className="backup-schedule-error">Could not load backup settings.</span>

  const update = (frequency: BackupFrequency, retentionCount: number) => {
    mutation.mutate({ frequency, retentionCount })
  }

  return (
    <div className="backup-schedule-control" aria-busy={mutation.isPending}>
      <div className="backup-schedule-fields">
        <label>
          <span>Frequency</span>
          <SelectDropdown
            value={settings.frequency}
            options={FREQUENCY_OPTIONS}
            onChange={(value) => update(value as BackupFrequency, settings.retention_count)}
            ariaLabel="Automatic backup frequency"
          />
        </label>
        <label>
          <span>Keep</span>
          <SelectDropdown
            value={String(settings.retention_count)}
            options={RETENTION_OPTIONS}
            onChange={(value) => update(settings.frequency, Number(value))}
            ariaLabel="Number of automatic backups to keep"
          />
        </label>
      </div>
      {settings.last_error ? (
        <span className="backup-schedule-error" title={settings.last_error}>
          <AlertCircle size={11} /> Automatic backup failed
        </span>
      ) : (
        <span className="backup-schedule-state">
          {settings.last_backup_at ? <Check size={11} /> : <Clock3 size={11} />}
          {statusLabel(settings)}
        </span>
      )}
      {mutation.isError && <span className="backup-schedule-error">Could not save backup settings.</span>}
    </div>
  )
}
