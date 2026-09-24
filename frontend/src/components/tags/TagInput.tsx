import { useState, useRef, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"
import { useFetchAllTags, useEntityTags, useAddTag, useRemoveTag, useCreateTag } from "@/hooks/useTags"
import { getTagColor } from "@/lib/colors"
import { TagBadge } from "./TagBadge"
import type { TagResponse } from "@/types/entities"

interface TagInputProps {
  entityType: string
  entityId: number
}

export function TagInput({ entityType, entityId }: TagInputProps) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: entityTags = [] } = useEntityTags(entityType, entityId)
  const { data: allTags = [] } = useFetchAllTags()
  const addTag = useAddTag()
  const removeTag = useRemoveTag()
  const createTag = useCreateTag()

  const normalizedQuery = query.trim().toLowerCase()
  const existingTagIds = new Set(entityTags.map((t: TagResponse) => t.id))

  const filteredResults = allTags.filter(
    (tag: TagResponse) => !existingTagIds.has(tag.id)
      && (normalizedQuery.length === 0 || tag.name.toLowerCase().includes(normalizedQuery)),
  )

  const hasExactMatch = allTags.some(
    (tag: TagResponse) => tag.name.toLowerCase() === normalizedQuery,
  )

  const showCreateOption = normalizedQuery.length >= 2 && !hasExactMatch

  const totalOptions = filteredResults.length + (showCreateOption ? 1 : 0)

  const handleAddExisting = useCallback(
    (tag: TagResponse) => {
      addTag.mutate({ tagId: tag.id, entityType, entityId })
      setQuery("")
      setIsOpen(false)
    },
    [addTag, entityType, entityId],
  )

  const handleCreateAndAdd = useCallback(async () => {
    const name = query.trim()
    if (!name) return
    createTag.mutate(name, {
      onSuccess: (newTag) => {
        addTag.mutate({ tagId: newTag.id, entityType, entityId })
        setQuery("")
        setIsOpen(false)
      },
    })
  }, [query, createTag, addTag, entityType, entityId])

  const handleRemove = useCallback(
    (tagId: number) => {
      removeTag.mutate({ tagId, entityType, entityId })
    },
    [removeTag, entityType, entityId],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || totalOptions === 0) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % totalOptions)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + totalOptions) % totalOptions)
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (activeIndex < filteredResults.length) {
          handleAddExisting(filteredResults[activeIndex])
        } else if (showCreateOption) {
          void handleCreateAndAdd()
        }
      } else if (e.key === "Escape") {
        setIsOpen(false)
        setQuery("")
      }
    },
    [isOpen, totalOptions, activeIndex, filteredResults, showCreateOption, handleAddExisting, handleCreateAndAdd],
  )

  useEffect(() => setActiveIndex(0), [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
      {entityTags.map((tag: TagResponse) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          onRemove={() => handleRemove(tag.id)}
        />
      ))}

      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag..."
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            padding: "2px 4px",
            width: "80px",
          }}
        />

        {isOpen && totalOptions > 0 && (
          <div
            ref={dropdownRef}
            className="ui-dropdown-menu ui-dropdown-menu-tags"
          >
            {filteredResults.map((tag: TagResponse, i: number) => (
              <button
                type="button"
                key={tag.id}
                onClick={() => handleAddExisting(tag)}
                className={`ui-dropdown-option${i === activeIndex ? " is-active" : ""}`}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: getTagColor(tag.color_index),
                    flexShrink: 0,
                  }}
                />
                {tag.name}
              </button>
            ))}

            {showCreateOption && (
              <button
                type="button"
                onClick={() => void handleCreateAndAdd()}
                className={`ui-dropdown-option ui-dropdown-option-accent${filteredResults.length > 0 ? " ui-dropdown-option-divider" : ""}${activeIndex === filteredResults.length ? " is-active" : ""}`}
              >
                <Plus size={14} />
                Create &ldquo;{query}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
