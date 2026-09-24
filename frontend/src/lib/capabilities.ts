import {
  Archive,
  CalendarDays,
  CheckSquare,
  Clock3,
  FilePlus2,
  FileText,
  FolderOpen,
  Home,
  Inbox,
  Lightbulb,
  ListFilter,
  Search,
  Settings,
  Sparkles,
  Tags,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type CapabilityCategory = "Navigate" | "Create" | "Find" | "Review" | "Organize"
export type CapabilityRoute = "/" | "/plan" | "/time" | "/inbox" | "/tasks" | "/notes" | "/ideas" | "/projects" | "/settings"

export interface Capability {
  id: string
  command: `/${string}`
  label: string
  description: string
  example: string
  category: CapabilityCategory
  icon: LucideIcon
  route?: CapabilityRoute
  prompt?: (argumentsText: string) => string
}

const scopedPrompt = (scope: string, argumentsText: string) =>
  `Work within ${scope}. ${argumentsText}`

export const capabilities: Capability[] = [
  { id: "today", command: "/today", label: "Today", description: "Open today’s workspace", example: "/today", category: "Navigate", icon: Home, route: "/", prompt: (args) => scopedPrompt("Today", args) },
  { id: "plan", command: "/plan", label: "Plan", description: "Open the planning workspace", example: "/plan", category: "Navigate", icon: CalendarDays, route: "/plan", prompt: (args) => scopedPrompt("Plan", args) },
  { id: "time", command: "/time", label: "Time", description: "Review tracked time", example: "/time", category: "Navigate", icon: Clock3, route: "/time", prompt: (args) => scopedPrompt("Time", args) },
  { id: "inbox", command: "/inbox", label: "Inbox", description: "Open unclassified captures", example: "/inbox", category: "Navigate", icon: Inbox, route: "/inbox", prompt: (args) => scopedPrompt("Inbox", args) },
  { id: "tasks", command: "/tasks", label: "Tasks", description: "Open or ask about tasks", example: "/tasks overdue this week", category: "Navigate", icon: CheckSquare, route: "/tasks", prompt: (args) => scopedPrompt("Tasks", args) },
  { id: "notes", command: "/notes", label: "Notes", description: "Open or ask about notes", example: "/notes about OptimizeLabs", category: "Navigate", icon: FileText, route: "/notes", prompt: (args) => scopedPrompt("Notes", args) },
  { id: "ideas", command: "/ideas", label: "Ideas", description: "Open or ask about ideas", example: "/ideas worth developing", category: "Navigate", icon: Lightbulb, route: "/ideas", prompt: (args) => scopedPrompt("Ideas", args) },
  { id: "projects", command: "/projects", label: "Projects", description: "Open or ask about projects", example: "/projects active this month", category: "Navigate", icon: FolderOpen, route: "/projects", prompt: (args) => scopedPrompt("Projects", args) },
  { id: "settings", command: "/settings", label: "Settings", description: "Open TodAI settings", example: "/settings", category: "Navigate", icon: Settings, route: "/settings" },

  { id: "new-task", command: "/new-task", label: "New task", description: "Create an actionable task", example: "/new-task Call John tomorrow", category: "Create", icon: CheckSquare, prompt: (args) => args ? `Create a new task: ${args}` : "Help me create a new task." },
  { id: "new-note", command: "/new-note", label: "New note", description: "Capture information as a note", example: "/new-note Meeting notes from today", category: "Create", icon: FilePlus2, prompt: (args) => args ? `Create a new note: ${args}` : "Help me create a new note." },
  { id: "new-idea", command: "/new-idea", label: "New idea", description: "Capture an idea to develop", example: "/new-idea Weekly reflection assistant", category: "Create", icon: Lightbulb, prompt: (args) => args ? `Create a new idea: ${args}` : "Help me create a new idea." },

  { id: "search", command: "/search", label: "Search workspace", description: "Find information across TodAI", example: "/search OptimizeLabs", category: "Find", icon: Search, prompt: (args) => args ? `Search my workspace for: ${args}` : "Help me search my workspace." },
  { id: "tagged", command: "/tagged", label: "Find by tag", description: "Find entries connected to a tag", example: "/tagged OptimizeLabs", category: "Find", icon: Tags, prompt: (args) => args ? `Find entries tagged with: ${args}` : "Show me my available tags." },

  { id: "summary-day", command: "/summary-day", label: "Day summary", description: "Review today’s work and progress", example: "/summary-day", category: "Review", icon: Sparkles, prompt: () => "Summarize my day, including progress, unfinished work, and useful patterns." },
  { id: "summary-week", command: "/summary-week", label: "Week summary", description: "Review this week’s work and progress", example: "/summary-week", category: "Review", icon: CalendarDays, prompt: () => "Summarize my week, including progress, unfinished work, and useful patterns." },
  { id: "overdue", command: "/overdue", label: "Overdue tasks", description: "Review work that needs attention", example: "/overdue", category: "Review", icon: ListFilter, prompt: () => "Show me my overdue tasks and help me decide what needs attention first." },

  { id: "organize", command: "/organize", label: "Organize workspace", description: "Find items that need classification", example: "/organize", category: "Organize", icon: Archive, prompt: () => "Review my workspace for items that need organizing, tagging, or archiving." },
]

export const capabilityCategories: CapabilityCategory[] = ["Navigate", "Create", "Find", "Review", "Organize"]

export function matchCapabilities(query: string, pathname: string): Capability[] {
  const normalized = query.trim().toLowerCase()
  return capabilities
    .filter((capability) => !normalized || [
      capability.command,
      capability.label,
      capability.description,
      capability.category,
    ].some((value) => value.toLowerCase().includes(normalized)))
    .sort((first, second) => {
      const firstContextual = first.route && (first.route === "/" ? pathname === "/" : pathname.startsWith(first.route)) ? 1 : 0
      const secondContextual = second.route && (second.route === "/" ? pathname === "/" : pathname.startsWith(second.route)) ? 1 : 0
      if (firstContextual !== secondContextual) return secondContextual - firstContextual
      return capabilities.indexOf(first) - capabilities.indexOf(second)
    })
}

export function parseCapabilityCommand(input: string): { capability: Capability; argumentsText: string } | null {
  const [command = "", ...argumentsParts] = input.trim().split(/\s+/)
  const capability = capabilities.find((item) => item.command === command.toLowerCase())
  return capability ? { capability, argumentsText: argumentsParts.join(" ") } : null
}
