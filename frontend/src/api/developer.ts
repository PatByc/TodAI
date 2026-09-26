import { apiClient, buildQueryString } from "./client"

export interface EfficiencyTotals {
  operations: number
  successful: number
  success_rate: number
  average_duration_ms: number
  p95_duration_ms: number
  input_tokens: number
  cached_input_tokens: number
  output_tokens: number
  embedding_tokens: number
  db_queries: number
  db_time_ms: number
  tool_chars_before: number
  tool_chars_after: number
  compression_tokens_before: number
  compression_tokens_after: number
  compression_saved_tokens: number
  indexed_chunks: number
  embeddings_created: number
  embeddings_reused: number
}

export interface EfficiencyDay extends EfficiencyTotals { date: string }

export interface EfficiencyOperation {
  id: number
  operation: string
  started_at: string
  duration_ms: number
  success: boolean
  error_type: string | null
  model: string | null
  input_tokens: number
  output_tokens: number
  embedding_tokens: number
  db_queries: number
  tool_chars_before: number
  tool_chars_after: number
  compression_saved_tokens: number
  embeddings_created: number
  embeddings_reused: number
}

export interface DeveloperMetrics {
  period_days: number
  generated_at: string
  summary: EfficiencyTotals
  daily: EfficiencyDay[]
  recent: EfficiencyOperation[]
  index: {
    total_chunks: number
    embedded_chunks: number
    by_entity_type: Record<string, number>
    embedding_models: Record<string, number>
  }
}

export function fetchDeveloperMetrics(days: number): Promise<DeveloperMetrics> {
  return apiClient.get(`/developer/metrics${buildQueryString({ days, recent_limit: 30 })}`)
}

export interface APICostTotals {
  requests: number
  priced_requests: number
  unpriced_requests: number
  input_tokens: number
  cached_input_tokens: number
  output_tokens: number
  estimated_cost_usd: number
}

export interface APICostDay extends APICostTotals { date: string }

export interface APICostBreakdown extends APICostTotals {
  provider: string
  model: string
  request_kind: string
}

export interface APICostRequest {
  id: number
  occurred_at: string
  operation: string
  provider: string
  model: string
  request_kind: string
  provider_request_id: string | null
  input_tokens: number
  cached_input_tokens: number
  output_tokens: number
  estimated_cost_usd: number | null
  pricing_status: "priced" | "unpriced" | "usage_missing"
  pricing_version: string | null
  input_price_per_million_usd: number | null
  cached_input_price_per_million_usd: number | null
  output_price_per_million_usd: number | null
}

export interface APICostResponse {
  period_days: number
  generated_at: string
  currency: "USD"
  summary: APICostTotals
  daily: APICostDay[]
  by_model: APICostBreakdown[]
  recent: APICostRequest[]
}

export function fetchAPICosts(days: number): Promise<APICostResponse> {
  return apiClient.get(`/developer/costs${buildQueryString({ days, recent_limit: 50 })}`)
}
