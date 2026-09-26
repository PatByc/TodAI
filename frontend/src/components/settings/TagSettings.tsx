import { Check, Plus, Search, Tag, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { ColorPicker } from "@/components/ui/ColorPicker"
import { useCreateTag, useDeleteTag, useFetchAllTags, useUpdateTagColor } from "@/hooks/useTags"
import { WORKSPACE_COLORS } from "@/lib/colorPalette"

function NewTagRow({ suggestedColor, onClose }: { suggestedColor: number; onClose: () => void }) {
  const createTag = useCreateTag()
  const [name, setName] = useState("")
  const [colorIndex, setColorIndex] = useState(suggestedColor)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])

  return (
    <form className="settings-tag-new" onSubmit={(event) => {
      event.preventDefault()
      const normalized = name.trim().replace(/\s+/g, " ")
      if (!normalized) return
      createTag.mutate({ name: normalized, color_index: colorIndex }, { onSuccess: onClose })
    }}>
      <ColorPicker value={colorIndex} colors={WORKSPACE_COLORS} onChange={setColorIndex} ariaLabel="New tag color" disabled={createTag.isPending} />
      <input ref={inputRef} value={name} maxLength={100} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") onClose() }} placeholder="Tag name" aria-label="New tag name" />
      <button type="submit" disabled={!name.trim() || createTag.isPending} aria-label="Create tag"><Check size={14} /></button>
      <button type="button" onClick={onClose} aria-label="Cancel new tag"><X size={14} /></button>
      {createTag.isError && <small>A tag with this name may already exist.</small>}
    </form>
  )
}

export function TagSettings() {
  const { data: tags = [], isLoading, error } = useFetchAllTags()
  const deleteTag = useDeleteTag()
  const updateColor = useUpdateTagColor()
  const [query, setQuery] = useState("")
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const visibleTags = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return normalized ? tags.filter((tag) => tag.name.toLowerCase().includes(normalized)) : tags
  }, [query, tags])

  return (
    <section className="settings-panel settings-tags" aria-labelledby="settings-tags-title">
      <div className="settings-section-heading">
        <h2 id="settings-tags-title">Tags</h2>
        <p>Manage the shared labels available across your workspace.</p>
      </div>

      <div className="settings-tag-toolbar">
        <label className="settings-tag-search">
          <Search size={13} strokeWidth={1.8} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a tag" aria-label="Find a tag" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear tag search"><X size={12} /></button>}
        </label>
        {!adding && <button type="button" className="settings-tag-add" onClick={() => setAdding(true)}><Plus size={13} /> Add tag</button>}
      </div>

      {adding && <NewTagRow suggestedColor={tags.length % WORKSPACE_COLORS.length} onClose={() => setAdding(false)} />}

      {isLoading ? <p className="settings-tag-state">Loading tags…</p> : error ? <p className="settings-tag-state is-error">Tags could not be loaded.</p> : visibleTags.length === 0 ? (
        <div className="settings-tag-empty"><Tag size={16} /><span>{tags.length === 0 ? "No tags yet." : "No matching tags."}</span></div>
      ) : (
        <div className="settings-tag-list">
          {visibleTags.map((tag) => {
            const confirming = confirmingId === tag.id
            const usageCount = tag.usage_count ?? 0
            return (
              <div className={confirming ? "is-confirming" : ""} key={tag.id}>
                <ColorPicker className="settings-tag-color" value={tag.color_index % WORKSPACE_COLORS.length} colors={WORKSPACE_COLORS} ariaLabel={`Color for ${tag.name}`} disabled={updateColor.isPending} onChange={(colorIndex) => updateColor.mutate({ tagId: tag.id, colorIndex })} />
                <span><strong>{tag.name}</strong><small>{usageCount === 0 ? "Unused" : `Used by ${usageCount} ${usageCount === 1 ? "entry" : "entries"}`}</small></span>
                {confirming ? (
                  <div className="settings-tag-confirm">
                    <button type="button" onClick={() => setConfirmingId(null)}>Cancel</button>
                    <button type="button" className="is-delete" disabled={deleteTag.isPending} onClick={() => deleteTag.mutate(tag.id, { onSuccess: () => setConfirmingId(null) })}>Delete</button>
                  </div>
                ) : (
                  <button type="button" className="settings-tag-delete" onClick={() => setConfirmingId(tag.id)} aria-label={`Delete ${tag.name}`} title={`Delete ${tag.name}`}><Trash2 size={14} strokeWidth={1.7} /></button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {deleteTag.isError && <p className="settings-tag-state is-error">The tag could not be deleted.</p>}
    </section>
  )
}
