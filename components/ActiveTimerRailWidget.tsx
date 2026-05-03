"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleStop, Play, TimerReset } from "lucide-react";

type Category = {
  id: string;
  name: string;
  color: string;
};

type ActiveTimer = {
  // ActiveTimer is nullable because the database should contain either zero or one active timer.
  id: number;
  title: string;
  notes: string | null;
  startedAt: string;
  category: Category | null;
} | null;

function formatElapsed(startedAt: string, now: number) {
  // The widget needs a live display; calculate elapsed from startedAt instead of storing elapsed time.
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ActiveTimerRailWidget() {
  const router = useRouter();

  // This widget is mounted globally in app/layout.tsx, so it owns its own timer/category data.
  const [activeTimer, setActiveTimer] = useState<ActiveTimer>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  // The AI assistant owns the rail open/closed control; the timer mirrors that state via a browser event.
  const [isRailOpen, setIsRailOpen] = useState(true);
  const [railOffsetPx, setRailOffsetPx] = useState(172);
  // This popup appears only for uncategorized sidebar timers, because category-card timers are already classified.
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [stopNote, setStopNote] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // Read the only active timer from the backend. The API enforces one running timer at a time.
  async function loadTimer() {
    const response = await fetch("/api/timer", { cache: "no-store" });
    const timer = (await response.json()) as ActiveTimer;
    setActiveTimer(timer);
  }

  async function loadCategories() {
    // Categories are fetched here instead of passed through layout because layout is shared and static by design.
    const response = await fetch("/api/categories", { cache: "no-store" });
    const data = (await response.json()) as Category[];
    setCategories(data);
  }

  useEffect(() => {
    void loadTimer();
    void loadCategories();

    // Other pages dispatch this event after timer changes, so the global widget refreshes immediately.
    function handleTimerChange() {
      void loadTimer();
      void loadCategories();
    }

    window.addEventListener("todai-timer-change", handleTimerChange);

    // Polling is a small fallback in case a timer changes from another page or browser tab.
    const poll = window.setInterval(() => void loadTimer(), 5000);

    return () => {
      window.removeEventListener("todai-timer-change", handleTimerChange);
      window.clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    // The AI widget controls the shared right-side rail; this timer listens and positions itself above it.
    function handleRailChange(event: Event) {
      const customEvent = event as CustomEvent<{ isOpen: boolean; railOffsetPx?: number }>;
      setIsRailOpen(Boolean(customEvent.detail?.isOpen));
      setRailOffsetPx(customEvent.detail?.railOffsetPx ?? 172);
    }

    window.addEventListener("todai-widget-rail-change", handleRailChange);
    return () => window.removeEventListener("todai-widget-rail-change", handleRailChange);
  }, []);

  useEffect(() => {
    if (!activeTimer) {
      document.title = "TodAI";
      return;
    }

    // While a timer is active, tick every second so the widget and browser tab title stay current.
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeTimer]);

  const elapsedLabel = activeTimer ? formatElapsed(activeTimer.startedAt, now) : "0:00";

  useEffect(() => {
    // Browser tab title acts as a tiny always-visible timer state indicator.
    if (!activeTimer) {
      document.title = "TodAI";
      return;
    }

    document.title = `${elapsedLabel} - TodAI`;
  }, [activeTimer, elapsedLabel]);

  // Starting from the sidebar intentionally creates an uncategorized session; the user categorizes it when stopping.
  async function startUncategorizedTimer() {
    setPendingAction("timer-start");

    // No categoryId is sent on purpose. The stop flow will ask the user where this time belongs.
    await fetch("/api/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Uncategorized session",
      }),
    });
    setPendingAction(null);
    await loadTimer();
    router.refresh();
  }

  // If the timer was started from a category card, it can be stopped immediately because the category is known.
  async function stopTimer() {
    setPendingAction("timer-stop");
    await fetch("/api/timer/stop", { method: "POST" });
    setPendingAction(null);
    await loadTimer();
    router.refresh();
  }

  // Uncategorized timers are saved only after the user picks a category and presses "Add entry".
  async function saveTimerEntry() {
    const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

    // Add entry stays disabled until a category is selected, but keep this guard for keyboard/programmatic calls.
    if (!selectedCategory) {
      return;
    }

    setPendingAction("timer-stop-category");

    // POST /api/timer/stop converts the ActiveTimer row into a permanent Entry row.
    await fetch("/api/timer/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: selectedCategory.name,
        categoryId: selectedCategory.id,
        notes: stopNote.trim() || null,
      }),
    });
    setStopNote("");
    setSelectedCategoryId("");
    setIsCategoryPickerOpen(false);
    setPendingAction(null);
    await loadTimer();
    // Refresh server-rendered pages such as /dashboard so timelines and totals include the new entry.
    router.refresh();
  }

  // Closing the popup throws away unsaved category/notes choices, but leaves the timer running.
  function closeCategoryPicker() {
    setIsCategoryPickerOpen(false);
    setSelectedCategoryId("");
    setStopNote("");
  }

  async function handleTimerButtonClick() {
    if (!activeTimer) {
      await startUncategorizedTimer();
      return;
    }

    // Uncategorized timers need the summary popup so notes and category can be added before saving.
    if (!activeTimer.category) {
      setIsCategoryPickerOpen(true);
      return;
    }

    await stopTimer();
  }

  return (
    <>
      {/* Hidden state keeps the widget mounted so elapsed time/title updates continue while the rail is closed. */}
      <div
        data-todai-widget-rail
        style={{ bottom: railOffsetPx }}
        className={`fixed right-4 z-40 w-[calc(100vw-2rem)] max-w-[220px] rounded-full border border-white/70 bg-gray-950 p-2 text-white shadow-2xl shadow-gray-400/60 transition-all duration-200 ease-out sm:right-6 sm:max-w-[190px] ${
          isRailOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className="grid size-10 shrink-0 place-items-center rounded-full"
            style={{ backgroundColor: activeTimer?.category?.color ?? "#22c55e" }}
          >
            {activeTimer ? <TimerReset size={20} /> : <Check size={20} />}
          </div>
          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="text-xs font-semibold leading-none text-white/50">Active timer</p>
            <p className="mt-1 truncate text-sm font-black">{activeTimer ? elapsedLabel : "No timer"}</p>
          </div>
          <span className="min-w-0 flex-1 truncate pr-1 text-sm font-black sm:hidden">
            {activeTimer ? elapsedLabel : "Timer"}
          </span>
          {/* One button covers start/stop because the app supports only one active timer. */}
          <button
            type="button"
            onClick={() => void handleTimerButtonClick()}
            disabled={pendingAction !== null}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-gray-950 transition hover:scale-105 disabled:cursor-not-allowed disabled:bg-white/40"
            title={activeTimer ? "Stop active timer" : "Start uncategorized timer"}
          >
            {activeTimer ? <CircleStop size={20} /> : <Play size={20} fill="currentColor" />}
          </button>
        </div>
      </div>

      {isCategoryPickerOpen ? (
        <div
          data-todai-widget-rail
          className="fixed inset-0 z-50 grid place-items-end bg-gray-950/20 p-4 backdrop-blur-sm sm:place-items-center"
        >
          <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white p-5 shadow-2xl">
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-500">Save tracked time</p>
              <h2 className="text-2xl font-black text-gray-950">Choose a category</h2>
              <p className="mt-1 text-sm text-gray-500">This uncategorized timer ran for {elapsedLabel}.</p>
            </div>
            <textarea
              value={stopNote}
              onChange={(event) => setStopNote(event.target.value)}
              placeholder="Optional notes"
              className="mb-4 min-h-24 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((category) => (
                // Selecting a category does not save yet; it only prepares the final Add entry request.
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  disabled={pendingAction !== null}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition hover:bg-white hover:shadow-sm disabled:opacity-50 ${
                    selectedCategoryId === category.id ? "border-gray-950 bg-white shadow-sm" : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <span className="size-4 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="min-w-0 flex-1 font-bold text-gray-800">{category.name}</span>
                  {selectedCategoryId === category.id ? (
                    <span className="grid size-6 place-items-center rounded-full bg-gray-950 text-white">
                      <Check size={14} />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void saveTimerEntry()}
              disabled={pendingAction !== null || !selectedCategoryId}
              className="mt-4 w-full rounded-2xl bg-gray-950 px-4 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Add entry
            </button>
            <button
              type="button"
              onClick={closeCategoryPicker}
              className="mt-3 w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
