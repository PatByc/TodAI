/**
 * Idea lifecycle pipeline visualization per D-13 and UI-SPEC.
 * Full-width interactive progress bar with 4 stages:
 * Raw, Developing, Converted, Archived.
 *
 * Vitality gradient colors from UI-SPEC:
 * - Raw: #2D6B35 (dim green)
 * - Developing: #3D8E48 (mid green)
 * - Converted: #4EBE5E (full accent)
 * - Unfilled: #2D3F36 (border)
 */

import type { IdeaState } from "@/types/entities"

interface PipelineStage {
  state: IdeaState
  label: string
  fillColor: string
  index: number
}

const STAGES: PipelineStage[] = [
  { state: "raw", label: "Raw", fillColor: "#2D6B35", index: 0 },
  { state: "developing", label: "Developing", fillColor: "#3D8E48", index: 1 },
  { state: "converted", label: "Converted", fillColor: "#4EBE5E", index: 2 },
  { state: "archived", label: "Archived", fillColor: "#5E7D69", index: 3 },
]

const UNFILLED_COLOR = "#2D3F36"

function getStageIndex(state: IdeaState): number {
  const found = STAGES.find((s) => s.state === state)
  return found ? found.index : 0
}

interface IdeaPipelineProps {
  state: IdeaState
  onStateChange?: (state: IdeaState) => void
}

export function IdeaPipeline({ state, onStateChange }: IdeaPipelineProps) {
  const currentIndex = getStageIndex(state)
  const isArchived = state === "archived"

  return (
    <div style={{ width: "100%", marginBottom: "24px" }}>
      {/* Pipeline bar segments */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          width: "100%",
        }}
      >
        {STAGES.slice(0, 3).map((stage) => {
          const isFilled = !isArchived && stage.index <= currentIndex
          // For archived state, all segments are dimmed
          const segmentColor = isArchived
            ? "rgba(94, 125, 105, 0.4)"
            : isFilled
              ? stage.fillColor
              : UNFILLED_COLOR

          return (
            <button
              key={stage.state}
              type="button"
              onClick={() => onStateChange?.(stage.state)}
              style={{
                flex: 1,
                height: "8px",
                borderRadius: "2px",
                backgroundColor: segmentColor,
                border: "none",
                cursor: onStateChange ? "pointer" : "default",
                padding: 0,
                transition: "background-color 0.2s ease",
              }}
              title={stage.label}
            />
          )
        })}
      </div>

      {/* Stage labels below segments */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          width: "100%",
          marginTop: "8px",
        }}
      >
        {STAGES.slice(0, 3).map((stage) => {
          const isCurrent = stage.state === state
          const isFilled = !isArchived && stage.index <= currentIndex

          return (
            <button
              key={stage.state}
              type="button"
              onClick={() => onStateChange?.(stage.state)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                padding: "2px 0",
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                fontWeight: isCurrent ? 600 : 400,
                color: isCurrent
                  ? stage.fillColor
                  : isFilled && !isArchived
                    ? "var(--muted-foreground)"
                    : "var(--text-3)",
                cursor: onStateChange ? "pointer" : "default",
                textAlign: "center",
                lineHeight: 1.5,
                transition: "color 0.2s ease",
              }}
            >
              {stage.label}
            </button>
          )
        })}
      </div>

      {/* Archived toggle below the main pipeline */}
      <div style={{ marginTop: "8px", textAlign: "right" }}>
        <button
          type="button"
          onClick={() => onStateChange?.(isArchived ? "raw" : "archived")}
          style={{
            background: "none",
            border: "none",
            padding: "2px 8px",
            fontFamily: "var(--font-body)",
            fontSize: "11px",
            fontWeight: isArchived ? 600 : 400,
            color: isArchived ? "#5E7D69" : "var(--text-3)",
            cursor: onStateChange ? "pointer" : "default",
            opacity: isArchived ? 1 : 0.6,
            transition: "all 0.2s ease",
          }}
        >
          {isArchived ? "Archived" : "Archive"}
        </button>
      </div>
    </div>
  )
}
