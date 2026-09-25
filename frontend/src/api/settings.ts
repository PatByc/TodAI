import { apiClient } from "./client"

export interface AISettings {
  context_compression_enabled: boolean
  compression_provider: string
  minimum_tokens: number
}

export function fetchAISettings(): Promise<AISettings> {
  return apiClient.get("/settings/ai-agent")
}

export function updateAISettings(contextCompressionEnabled: boolean): Promise<AISettings> {
  return apiClient.put("/settings/ai-agent", {
    context_compression_enabled: contextCompressionEnabled,
  })
}
