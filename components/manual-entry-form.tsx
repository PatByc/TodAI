"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

type Category = {
  id: string;
  name: string;
  color: string;
};

type ManualEntryFormProps = {
  categories: Category[];
};

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function createDefaultEntry() {
  const end = new Date();
  const start = new Date(end);
  start.setHours(start.getHours() - 1);

  return {
    title: "",
    notes: "",
    startTime: toDateTimeLocal(start),
    endTime: toDateTimeLocal(end),
    categoryId: "",
  };
}

export function ManualEntryForm({ categories }: ManualEntryFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(createDefaultEntry);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      return;
    }

    // Manual entries are historical records, so submit directly to the entries API and then refresh server data.
    setIsSubmitting(true);
    await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title.trim(),
        notes: draft.notes.trim() || null,
        startTime: draft.startTime,
        endTime: draft.endTime,
        categoryId: draft.categoryId || null,
      }),
    });
    setDraft(createDefaultEntry());
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80">
      <div className="mb-5">
        <p className="text-sm font-semibold text-gray-500">Manual entry</p>
        <h1 className="text-3xl font-black tracking-tight text-gray-950">Log past time</h1>
      </div>
      <form onSubmit={(event) => void createEntry(event)} className="grid gap-3 lg:grid-cols-2">
        <input
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          placeholder="What did you do?"
          className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
        />
        <select
          value={draft.categoryId}
          onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
          className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
        >
          <option value="">No category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={draft.startTime}
          onChange={(event) => setDraft({ ...draft, startTime: event.target.value })}
          className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
        />
        <input
          type="datetime-local"
          value={draft.endTime}
          onChange={(event) => setDraft({ ...draft, endTime: event.target.value })}
          className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
        />
        <input
          value={draft.notes}
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          placeholder="Optional notes"
          className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white lg:col-span-2"
        />
        <button
          type="submit"
          disabled={isSubmitting || !draft.title.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 lg:col-span-2"
        >
          <Plus size={17} />
          Add entry
        </button>
      </form>
    </section>
  );
}
