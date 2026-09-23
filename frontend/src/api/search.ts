import { apiClient, buildQueryString } from "./client"

export type SearchMode = "keyword" | "semantic" | "hybrid"

export interface SearchResult {
  entity_type: "note" | "task" | "idea" | "project" | "inbox_item"
  entity_id: number
  chunk_index: number
  title: string
  snippet: string
  section: string
  project_id: number | null
  tags: string[]
  score: number
  matched_by: Array<"keyword" | "semantic">
  url: string
}

export interface SearchResponse {
  query: string
  mode: SearchMode
  semantic_available: boolean
  results: SearchResult[]
  elapsed_ms: number
}

export function searchEverything(
  query: string,
  mode: SearchMode = "hybrid",
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const path = `/search${buildQueryString({ q: query, mode })}`
  if (!signal) return apiClient.get<SearchResponse>(path)

  return fetch(`/api/v1${path}`, {
    signal,
    headers: { "Content-Type": "application/json" },
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Search failed (${response.status})`)
    return response.json() as Promise<SearchResponse>
  })
}
