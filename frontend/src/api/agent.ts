import { apiClient } from "./client"

export interface AgentTurn { role: "user" | "assistant"; content: string }
export interface AgentStatus { available: boolean; reason: string | null }
export interface AgentAction {
  operation: "create" | "update" | "archive" | "unarchive" | "delete" | "convert" | "tag" | "untag"
  entity_type: "note" | "task" | "idea" | "project" | "inbox_item"
  entity_id: number | null
  fields: Record<string, unknown>
  description: string
}
export interface AgentSource { number: number; title?: string; url?: string; entity_type: string; entity_id: number }
export interface AgentPlan { id: string | null; message: string; actions: AgentAction[]; expires_at: string | null; sources: AgentSource[] }
export interface AgentApplyResult {
  operation: AgentAction["operation"]; entity_type: AgentAction["entity_type"]; entity_id: number | null
  description: string; success: boolean; detail: string; url: string | null
}
export interface AgentDecision { status: "applied" | "failed" | "rejected"; results: AgentApplyResult[] }
export interface AgentEvent { sequence: number; event: string; data: Record<string, unknown> }

export function getAgentStatus(): Promise<AgentStatus> { return apiClient.get<AgentStatus>("/agent/status") }
export function startAgentRun(question: string, history: AgentTurn[], approvalMode: "manual" | "auto"): Promise<{ run_id: string }> {
  return apiClient.post<{ run_id: string }>("/agent/runs", { question, history, approval_mode: approvalMode })
}
export function approveAgent(id: string): Promise<{ run_id: string }> {
  return apiClient.post<{ run_id: string }>(`/agent/proposals/${encodeURIComponent(id)}/approve`)
}
export async function rejectAgent(id: string): Promise<AgentDecision> {
  const result = await apiClient.post<{ status: "rejected" }>(`/agent/proposals/${encodeURIComponent(id)}/reject`)
  return { ...result, results: [] }
}

const eventNames = [
  "run_started", "tools_selected", "tool_started", "tool_progress", "tool_completed", "tool_failed",
  "answer_composing", "proposal_ready", "approval_required", "batch_started", "batch_committed",
  "batch_rolled_back", "auto_approved", "run_completed", "run_failed",
]

export function streamAgentRun(runId: string, onEvent: (event: AgentEvent) => void, onDisconnect: () => void): () => void {
  let source: EventSource | undefined
  let retryTimer: number | undefined
  let retries = 0
  let lastSequence = 0
  let stopped = false

  const connect = () => {
    const suffix = lastSequence > 0 ? `?after=${lastSequence}` : ""
    source = new EventSource(`/api/v1/agent/runs/${encodeURIComponent(runId)}/events${suffix}`)
    for (const eventName of eventNames) {
      source.addEventListener(eventName, (raw) => {
        const message = raw as MessageEvent<string>
        lastSequence = Number(message.lastEventId || lastSequence)
        retries = 0
        onEvent({ sequence: lastSequence, event: eventName, data: JSON.parse(message.data) as Record<string, unknown> })
        if (["approval_required", "run_completed", "run_failed"].includes(eventName)) {
          stopped = true
          source?.close()
        }
      })
    }
    source.onerror = () => {
      source?.close()
      if (stopped) return
      retries += 1
      if (retries > 5) {
        stopped = true
        onDisconnect()
        return
      }
      retryTimer = window.setTimeout(connect, Math.min(500 * retries, 2_000))
    }
  }
  connect()
  return () => {
    stopped = true
    source?.close()
    if (retryTimer !== undefined) window.clearTimeout(retryTimer)
  }
}
