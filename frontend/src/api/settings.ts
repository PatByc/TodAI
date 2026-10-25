import { apiClient } from "./client"

export interface AISettings {
  context_compression_enabled: boolean
  compression_provider: string
  minimum_tokens: number
}

export interface MorningSettings {
  start_time: string
  end_time: string
}

export type EveningSettings = MorningSettings

export function fetchAISettings(): Promise<AISettings> {
  return apiClient.get("/settings/ai-agent")
}

export function updateAISettings(contextCompressionEnabled: boolean): Promise<AISettings> {
  return apiClient.put("/settings/ai-agent", {
    context_compression_enabled: contextCompressionEnabled,
  })
}

export function fetchMorningSettings(): Promise<MorningSettings> {
  return apiClient.get("/settings/morning")
}

export function updateMorningSettings(settings: MorningSettings): Promise<MorningSettings> {
  return apiClient.put("/settings/morning", settings)
}

export function fetchEveningSettings(): Promise<EveningSettings> {
  return apiClient.get("/settings/evening")
}

export function updateEveningSettings(settings: EveningSettings): Promise<EveningSettings> {
  return apiClient.put("/settings/evening", settings)
}
