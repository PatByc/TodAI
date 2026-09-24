/**
 * Card component for idea list items.
 * Displays configurable idea details while keeping the title always visible.
 */

import { Link } from "@tanstack/react-router"
import { formatRelativeTime, truncateText } from "@/lib/format"
import { TagBadge } from "./TagBadge"
import type { Idea, IdeaState } from "@/types/entities"
import type { IdeaDisplayField } from "@/components/ideas/IdeaDisplayOptions"

interface IdeaCardProps {
  idea: Idea
  displayFields: IdeaDisplayField[]
}

const STATE_LABELS: Record<IdeaState, string> = {
  raw: "Raw",
  developing: "Developing",
  converted: "Converted",
  archived: "Archived",
}

export function IdeaCard({ idea, displayFields }: IdeaCardProps) {
  const excerpt = truncateText(idea.content, 80)
  const relativeTime = formatRelativeTime(idea.updated_at)
  const shows = (field: IdeaDisplayField) => displayFields.includes(field)
  const showIndicators = shows("state") || (shows("tags") && idea.tags.length > 0)
  const showMeta = shows("updated") || (shows("archived") && Boolean(idea.archived_at))

  return (
    <Link
      to="/ideas/$ideaId"
      params={{ ideaId: String(idea.id) }}
      className="entity-list-card"
    >
      <div className="entity-card-content">
        <div className="entity-card-title-row">
          <span className="entity-card-title">
            {idea.title}
          </span>
          {showIndicators && (
            <div className="entity-card-indicators">
              {shows("tags") && idea.tags.map((tag) => <TagBadge key={tag.id} tag={tag} />)}
              {shows("state") && (
                <span className={`idea-card-state idea-card-state-${idea.state}`}>
                  {STATE_LABELS[idea.state]}
                </span>
              )}
            </div>
          )}
        </div>

        {shows("preview") && excerpt && (
          <p className="entity-card-preview">{excerpt}</p>
        )}

        {showMeta && (
          <div className="entity-card-meta">
            {shows("archived") && idea.archived_at && <span className="entity-card-archived">Archived</span>}
            {shows("updated") && <span>Updated {relativeTime}</span>}
          </div>
        )}
      </div>
    </Link>
  )
}
