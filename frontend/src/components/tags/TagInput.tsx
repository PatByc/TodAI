import { useState, useRef, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"
import { useSearchTags, useEntityTags, useAddTag, useRemoveTag, useCreateTag } from "@/hooks/useTags"
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
  const { data: searchResults = [] } = useSearchTags(query)
  const addTag = useAddTag()
  const removeTag = useRemoveTag()
  const createTag = useCreateTag()

  const existingTagIds = new Set(entityTags.map((t: TagResponse) => t.id))

  const filteredResults = searchResults.filter(
    (t: TagResponse) => !existingTagIds.has(t.id),
  )

  const hasExactMatch = searchResults.some(
    (t: TagResponse) => t.name.toLowerCase() === query.toLowerCase(),
  )

  const showCreateOption = query.length >= 2 && !hasExactMatch

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

  useEffect(() => {
    if (query.length >= 2) {
      setIsOpen(true)
      setActiveIndex(0)
    } else {
      setIsOpen(false)
    }
  }, [query])

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
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "4px",
              minWidth: "200px",
              backgroundColor: "var(--secondary)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              zIndex: 20,
              overflow: "hidden",
            }}
          >
            {filteredResults.map((tag: TagResponse, i: number) => (
              <button
                key={tag.id}
                onClick={() => handleAddExisting(tag)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "8px 12px",
                  background: i === activeIndex ? "var(--bg-hover)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--foreground)",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  textAlign: "left",
                }}
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
                onClick={() => void handleCreateAndAdd()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "8px 12px",
                  background:
                    activeIndex === filteredResults.length
                      ? "var(--bg-hover)"
                      : "transparent",
                  border: "none",
                  borderTop: filteredResults.length > 0 ? "1px solid var(--border-subtle)" : "none",
                  cursor: "pointer",
                  color: "var(--primary)",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  textAlign: "left",
                }}
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
