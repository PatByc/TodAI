const UNTITLED_ENTRY = /^untitled(?:\s+(?:task|note|idea))?$/i

export function shouldAutoName(title: string) {
  return !title.trim() || UNTITLED_ENTRY.test(title.trim())
}

export function deriveEntryTitle(text: string, fallback: string) {
  const normalized = text
    .replace(/^\s*(?:#{1,6}\s+|[-*>]\s+|\d+[.)]\s+)/, "")
    .replace(/\s+/g, " ")
    .trim()
  if (!normalized) return fallback

  const sentenceEnd = normalized.search(/[.!?](?:\s|$)/)
  let candidate = sentenceEnd >= 0 ? normalized.slice(0, sentenceEnd + 1) : normalized
  if (candidate.length > 72) {
    const clipped = candidate.slice(0, 72)
    const lastSpace = clipped.lastIndexOf(" ")
    candidate = `${clipped.slice(0, lastSpace >= 36 ? lastSpace : 72).trim()}…`
  }

  return candidate.replace(/[.!?,;:]+$/, "").trim() || fallback
}

export function extractPlainText(node: Record<string, unknown>): string {
  const parts: string[] = []
  if (node.text && typeof node.text === "string") parts.push(node.text)
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      if (child && typeof child === "object") {
        parts.push(extractPlainText(child as Record<string, unknown>))
      }
    }
  }

  const nodeType = node.type as string | undefined
  if (["paragraph", "heading", "codeBlock", "blockquote", "listItem", "taskItem"].includes(nodeType ?? "")) {
    parts.push("\n")
  }
  return parts.join("")
}
