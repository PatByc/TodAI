import { useEffect, useRef, useState } from "react"
import { Check, Plus, X } from "lucide-react"
import {
  useCreateTimeCategory,
  useCreateTimeStream,
  useTimeStreams,
  useUpdateTimeCategory,
  useUpdateTimeStream,
} from "@/hooks/useTimeConfiguration"
import type { TimeCategory, TimeStream } from "@/types/entities"

const TIME_COLORS = [
  "#93a09a", "#6f8f82", "#82a66f", "#a3c75d", "#b8ff62", "#d2b45e",
  "#c98465", "#9d8bc1", "#748fb7", "#61a2a0", "#a47782", "#889094",
]

function Toggle({ checked, label, onChange, disabled = false }: {
  checked: boolean
  label: string
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={`time-config-toggle${checked ? " is-active" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
    >
      <span />
    </button>
  )
}

function EditableName({ value, label, onSave, disabled = false }: {
  value: string
  label: string
  onSave: (value: string) => void
  disabled?: boolean
}) {
  const [name, setName] = useState(value)
  useEffect(() => setName(value), [value])

  const save = () => {
    const normalized = name.trim().replace(/\s+/g, " ")
    if (!normalized) {
      setName(value)
      return
    }
    if (normalized !== value) onSave(normalized)
  }

  return (
    <input
      className="time-config-name"
      value={name}
      aria-label={label}
      disabled={disabled}
      onChange={(event) => setName(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur()
        if (event.key === "Escape") {
          setName(value)
          event.currentTarget.blur()
        }
      }}
    />
  )
}

function NewNameForm({ label, placeholder, onCancel, onCreate, pending }: {
  label: string
  placeholder: string
  onCancel: () => void
  onCreate: (name: string) => void
  pending: boolean
}) {
  const [name, setName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])

  return (
    <form
      className="time-config-new-form"
      onSubmit={(event) => {
        event.preventDefault()
        const normalized = name.trim().replace(/\s+/g, " ")
        if (normalized) onCreate(normalized)
      }}
    >
      <input
        ref={inputRef}
        value={name}
        maxLength={100}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Escape") onCancel() }}
      />
      <button type="submit" disabled={!name.trim() || pending} aria-label={`Create ${label}`}>
        <Check size={14} />
      </button>
      <button type="button" onClick={onCancel} aria-label={`Cancel ${label}`}>
        <X size={14} />
      </button>
    </form>
  )
}

function CategoryRow({ category, streamActive, onError }: {
  category: TimeCategory
  streamActive: boolean
  onError: (message: string) => void
}) {
  const updateCategory = useUpdateTimeCategory()
  const update = (data: { name?: string; is_active?: boolean }) => {
    onError("")
    updateCategory.mutate({ id: category.id, data }, {
      onError: (error) => onError(error instanceof Error ? error.message : "Could not update category."),
    })
  }
  return (
    <div className={`time-category-row${category.is_active && streamActive ? "" : " is-inactive"}`}>
      <span className="time-config-branch" aria-hidden="true" />
      <span className="time-config-dot" style={{ background: TIME_COLORS[category.color_index % TIME_COLORS.length] }} />
      <EditableName
        value={category.name}
        label={`Category name: ${category.name}`}
        onSave={(name) => update({ name })}
        disabled={updateCategory.isPending}
      />
      <Toggle
        checked={category.is_active}
        label={`${category.is_active ? "Disable" : "Enable"} ${category.name}`}
        onChange={() => update({ is_active: !category.is_active })}
        disabled={updateCategory.isPending}
      />
    </div>
  )
}

function StreamGroup({ stream, onError }: { stream: TimeStream; onError: (message: string) => void }) {
  const [addingCategory, setAddingCategory] = useState(false)
  const updateStream = useUpdateTimeStream()
  const createCategory = useCreateTimeCategory()
  const update = (data: { name?: string; is_active?: boolean }) => {
    onError("")
    updateStream.mutate({ id: stream.id, data }, {
      onError: (error) => onError(error instanceof Error ? error.message : "Could not update stream."),
    })
  }

  return (
    <section className={`time-stream-group${stream.is_active ? "" : " is-inactive"}`}>
      <div className="time-stream-row">
        <span className="time-stream-mark" style={{ background: TIME_COLORS[stream.color_index % TIME_COLORS.length] }} />
        <EditableName
          value={stream.name}
          label={`Time stream name: ${stream.name}`}
          onSave={(name) => update({ name })}
          disabled={updateStream.isPending}
        />
        <span className="time-stream-count">{stream.categories.length} {stream.categories.length === 1 ? "category" : "categories"}</span>
        <Toggle
          checked={stream.is_active}
          label={`${stream.is_active ? "Disable" : "Enable"} ${stream.name}`}
          onChange={() => update({ is_active: !stream.is_active })}
          disabled={updateStream.isPending}
        />
      </div>
      <div className="time-category-list">
        {stream.categories.map((category) => (
          <CategoryRow key={category.id} category={category} streamActive={stream.is_active} onError={onError} />
        ))}
        {addingCategory ? (
          <NewNameForm
            label="category"
            placeholder="Category name"
            pending={createCategory.isPending}
            onCancel={() => setAddingCategory(false)}
            onCreate={(name) => {
              onError("")
              createCategory.mutate({ stream_id: stream.id, name }, {
                onSuccess: () => setAddingCategory(false),
                onError: (error) => onError(error instanceof Error ? error.message : "Could not create category."),
              })
            }}
          />
        ) : (
          <button type="button" className="time-config-add time-config-add-category" onClick={() => setAddingCategory(true)}>
            <Plus size={13} /> Add category
          </button>
        )}
      </div>
    </section>
  )
}

export function TimeSettings() {
  const { data: streams = [], isLoading, error } = useTimeStreams()
  const createStream = useCreateTimeStream()
  const [addingStream, setAddingStream] = useState(false)
  const [mutationError, setMutationError] = useState("")

  return (
    <section className="settings-panel" aria-labelledby="settings-time-title">
      <div className="settings-section-heading">
        <h2 id="settings-time-title">Time</h2>
        <p>Organize tracked time into streams and their categories.</p>
      </div>
      <div className="time-config-list">
        {isLoading && <p className="time-config-state">Loading time settings…</p>}
        {error && <p className="time-config-error" role="alert">Could not load time settings.</p>}
        {!isLoading && !error && streams.map((stream) => (
          <StreamGroup key={stream.id} stream={stream} onError={setMutationError} />
        ))}
      </div>
      {addingStream ? (
        <NewNameForm
          label="time stream"
          placeholder="Stream name"
          pending={createStream.isPending}
          onCancel={() => setAddingStream(false)}
          onCreate={(name) => {
            setMutationError("")
            createStream.mutate({ name }, {
              onSuccess: () => setAddingStream(false),
              onError: (mutationError) => setMutationError(mutationError instanceof Error ? mutationError.message : "Could not create stream."),
            })
          }}
        />
      ) : (
        <button type="button" className="time-config-add time-config-add-stream" onClick={() => setAddingStream(true)}>
          <Plus size={14} /> Add stream
        </button>
      )}
      {mutationError && <p className="time-config-error" role="alert">{mutationError}</p>}
    </section>
  )
}
