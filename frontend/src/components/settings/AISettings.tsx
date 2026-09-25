import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchAISettings, updateAISettings } from "@/api/settings"

export function AISettings() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ["settings", "ai-agent"],
    queryFn: fetchAISettings,
  })
  const update = useMutation({
    mutationFn: updateAISettings,
    onSuccess: (next) => queryClient.setQueryData(["settings", "ai-agent"], next),
  })

  return (
    <section className="settings-panel" aria-labelledby="settings-ai-title">
      <div className="settings-section-heading">
        <h2 id="settings-ai-title">AI Agent</h2>
        <p>Control how Tod prepares context before sending it to the model.</p>
      </div>

      {isLoading && <p className="settings-inline-state">Loading AI settings…</p>}
      {error && <p className="settings-inline-state settings-inline-error" role="alert">Could not load AI settings.</p>}
      {data && (
        <div className="settings-row">
          <div>
            <strong>Context compression</strong>
            <span>
              Use {data.compression_provider} for prompts larger than {data.minimum_tokens.toLocaleString()} tokens. Invalid or retrieval-dependent output is discarded.
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={data.context_compression_enabled}
            aria-label="Context compression"
            className={`time-config-toggle${data.context_compression_enabled ? " is-active" : ""}`}
            disabled={update.isPending}
            onClick={() => update.mutate(!data.context_compression_enabled)}
          >
            <span aria-hidden="true" />
          </button>
        </div>
      )}
      {update.error && <p className="settings-inline-state settings-inline-error" role="alert">Could not save AI settings.</p>}
    </section>
  )
}
