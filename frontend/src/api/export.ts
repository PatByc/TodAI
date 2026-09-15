/**
 * API functions for data export.
 * Triggers browser download of exported data in JSON or Markdown format.
 */

const API_BASE = "/api/v1"

export async function exportData(format: "json" | "markdown"): Promise<void> {
  const response = await fetch(`${API_BASE}/export?format=${format}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error(`Export failed: HTTP ${response.status}`)
  }

  const blob = await response.blob()
  const filename = format === "json" ? "todai-export.json" : "todai-export.md"
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()

  // Cleanup
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
