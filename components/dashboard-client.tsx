"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleStop, Palette, Pencil, Play, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { type AppLanguage, useAppLanguage } from "@/components/use-app-language";

type Category = {
  id: string;
  name: string;
  color: string;
};

type Entry = {
  id: string;
  title: string;
  notes: string | null;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  category: Category | null;
};

type PlannedBlock = {
  id: string;
  title: string;
  notes: string | null;
  startTime: string;
  endTime: string;
  category: Category | null;
};

type Goal = {
  id: string;
  title: string;
  targetMinutes: number;
  period: "DAILY" | "WEEKLY" | "MONTHLY";
};

type Routine = {
  id: string;
  title: string;
  timeOfDay: string;
};

type ActiveTimer = {
  id: number;
  title: string;
  notes: string | null;
  startedAt: string;
  category: Category | null;
} | null;

type DashboardClientProps = {
  dashboardQuote: {
    text: string;
    translation?: string;
    source?: string;
  };
  activeTimer: ActiveTimer;
  todayEntries: Entry[];
  plannedBlocks: PlannedBlock[];
  // scoreEntries/scorePlannedBlocks include the last 30 days so the client can render 7/14/30 day score trends.
  scoreEntries: Entry[];
  scorePlannedBlocks: PlannedBlock[];
  categories: Category[];
  goals: Goal[];
  routines: Routine[];
};

type CategoryStat = Category & {
  minutes: number;
  entries: number;
};

type ScoreTrendDay = {
  // key is YYYY-MM-DD and is used for stable React keys plus matching entries/plans to a day.
  key: string;
  label: string;
  dateLabel: string;
  // score is shown on the graph's 0-10 y-axis; percent powers the small normalized bar in the tooltip.
  score: number;
  percent: number;
  actualMinutes: number;
  plannedMinutes: number;
  entryCount: number;
};

const timelineStartHour = 6;
const timelineEndHour = 22;
const scorePeriodOptions = [7, 14, 30];

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function getDailyTarget(goals: Goal[]) {
  const primary = goals.find((goal) => goal.period === "DAILY") ?? goals[0];

  if (!primary) {
    return { minutes: 240, title: "Daily focus" };
  }

  if (primary.period === "WEEKLY") {
    return { minutes: Math.max(1, Math.round(primary.targetMinutes / 5)), title: primary.title };
  }

  if (primary.period === "MONTHLY") {
    return { minutes: Math.max(1, Math.round(primary.targetMinutes / 22)), title: primary.title };
  }

  return { minutes: primary.targetMinutes, title: primary.title };
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getDayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getScoreDays(periodDays: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build the selected date range locally so changing 7/14/30 days does not need another server fetch.
  return Array.from({ length: periodDays }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (periodDays - 1 - index));
    return day;
  });
}

function getPlannedDurationMinutes(block: PlannedBlock) {
  // Planned blocks store start/end timestamps, so calculate their duration on the client for scoring.
  return Math.max(0, Math.round((new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000));
}

function getSuccessScore(actualMinutes: number, plannedMinutes: number) {
  if (plannedMinutes <= 0) {
    // With no plan, any tracked work gets a neutral 5/10 instead of pretending the day was fully planned.
    return {
      score: actualMinutes > 0 ? 5 : 0,
      percent: actualMinutes > 0 ? 50 : 0,
    };
  }

  // Planned-vs-actual is normalized to the 0-10 score scale used by the History page.
  const percent = Math.min(100, Math.round((actualMinutes / plannedMinutes) * 100));
  return {
    score: Math.round((percent / 10) * 10) / 10,
    percent,
  };
}

function formatTrendLabel(date: Date, language: AppLanguage) {
  return date.toLocaleDateString(language === "pl" ? "pl-PL" : undefined, { weekday: "short" }).slice(0, 1);
}

function formatTrendTooltipDate(date: Date, language: AppLanguage) {
  return date.toLocaleDateString(language === "pl" ? "pl-PL" : undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTimeBlockPosition(block: { startTime: string; endTime: string | null }, startHour: number, endHour: number) {
  const start = new Date(block.startTime);
  const end = block.endTime ? new Date(block.endTime) : new Date();
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const rangeStartMinutes = startHour * 60;
  const rangeEndMinutes = endHour * 60;
  const rangeMinutes = Math.max(60, rangeEndMinutes - rangeStartMinutes);
  const clampedStart = Math.max(rangeStartMinutes, Math.min(rangeEndMinutes, startMinutes));
  const clampedEnd = Math.max(clampedStart + 12, Math.min(rangeEndMinutes, endMinutes));
  const top = ((clampedStart - rangeStartMinutes) / rangeMinutes) * 100;
  const height = Math.max(4, ((clampedEnd - clampedStart) / rangeMinutes) * 100);

  return { top, height };
}

function overlapsTimelineRange(block: { startTime: string; endTime: string | null }, startHour: number, endHour: number) {
  const start = new Date(block.startTime);
  const end = block.endTime ? new Date(block.endTime) : new Date();
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();

  return startMinutes < endHour * 60 && endMinutes > startHour * 60;
}

function withAlpha(hexColor: string, alpha: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hexColor)) {
    return hexColor;
  }

  return `${hexColor}${alpha}`;
}

function getPieGradient(stats: CategoryStat[], totalMinutes: number) {
  if (totalMinutes <= 0 || stats.length === 0) {
    return "conic-gradient(#e5e7eb 0deg 360deg)";
  }

  let cursor = 0;
  const stops = stats
    .filter((stat) => stat.minutes > 0)
    .map((stat) => {
      const slice = (stat.minutes / totalMinutes) * 360;
      const stop = `${stat.color} ${cursor}deg ${cursor + slice}deg`;
      cursor += slice;
      return stop;
    });

  return `conic-gradient(${stops.join(", ")})`;
}

export function DashboardClient({
  dashboardQuote,
  activeTimer,
  todayEntries,
  plannedBlocks,
  scoreEntries,
  scorePlannedBlocks,
  categories,
  goals,
  routines,
}: DashboardClientProps) {
  const router = useRouter();
  const { language, t } = useAppLanguage();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, Category>>({});
  const [newCategory, setNewCategory] = useState({ name: "", color: "#8b5cf6" });
  const [timelineRange, setTimelineRange] = useState({
    startHour: timelineStartHour,
    endHour: timelineEndHour,
  });
  // The score trend defaults to 7 days but can expand without another server request.
  const [scorePeriodDays, setScorePeriodDays] = useState(7);
  const quoteText = language === "pl" && dashboardQuote.translation ? dashboardQuote.translation : dashboardQuote.text;

  const totalToday = todayEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const dailyTarget = getDailyTarget(goals);
  const dailyTargetLabel = language === "pl" && dailyTarget.title === "Daily focus" ? "Codzienne skupienie" : dailyTarget.title;
  const goalPercent = Math.min(100, Math.round((totalToday / dailyTarget.minutes) * 100));

  const categoryStats = useMemo<CategoryStat[]>(() => {
    // Category stats feed both the summary panel and the dashboard pie chart.
    return categories.map((category) => {
      const entries = todayEntries.filter((entry) => entry.category?.id === category.id);
      return {
        ...category,
        minutes: entries.reduce((sum, entry) => sum + entry.durationMinutes, 0),
        entries: entries.length,
      };
    });
  }, [categories, todayEntries]);

  const topCategory = categoryStats.reduce<CategoryStat | null>((winner, stat) => {
    if (!winner || stat.minutes > winner.minutes) {
      return stat;
    }

    return winner;
  }, null);

  const scoreTrendDays = useMemo(() => {
    // Each score point combines entries and planned blocks for that calendar day.
    return getScoreDays(scorePeriodDays).map((day) => {
      const key = getDayKey(day);
      const entries = scoreEntries.filter((entry) => getDayKey(entry.startTime) === key);
      const blocks = scorePlannedBlocks.filter((block) => getDayKey(block.startTime) === key);
      const actualMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
      const plannedMinutes = blocks.reduce((sum, block) => sum + getPlannedDurationMinutes(block), 0);
      const success = getSuccessScore(actualMinutes, plannedMinutes);

      return {
        key,
        label: formatTrendLabel(day, language),
        dateLabel: formatTrendTooltipDate(day, language),
        score: success.score,
        percent: success.percent,
        actualMinutes,
        plannedMinutes,
        entryCount: entries.length,
      };
    });
  }, [language, scoreEntries, scorePeriodDays, scorePlannedBlocks]);

  const visibleTimelineEntries = todayEntries.filter((entry) => {
    // Daily timeline can be narrowed to a custom visible time range.
    return overlapsTimelineRange(entry, timelineRange.startHour, timelineRange.endHour);
  });

  const visiblePlannedBlocks = plannedBlocks.filter((block) => {
    // Planned blocks use the same visibility filter as actual entries so both align on the same axis.
    return overlapsTimelineRange(block, timelineRange.startHour, timelineRange.endHour);
  });

  async function startTimer(category: Category) {
    setPendingAction(category.id);
    await fetch("/api/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: category.name,
        categoryId: category.id,
      }),
    });
    setPendingAction(null);
    window.dispatchEvent(new Event("todai-timer-change"));
    router.refresh();
  }

  async function stopTimer() {
    setPendingAction("stop");
    await fetch("/api/timer/stop", { method: "POST" });
    setPendingAction(null);
    window.dispatchEvent(new Event("todai-timer-change"));
    router.refresh();
  }

  function getCategoryDraft(category: Category) {
    return categoryDrafts[category.id] ?? category;
  }

  function updateCategoryDraft(category: Category, patch: Partial<Category>) {
    setCategoryDrafts((current) => ({
      ...current,
      [category.id]: {
        ...getCategoryDraft(category),
        ...patch,
      },
    }));
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newCategory.name.trim()) {
      return;
    }

    setPendingAction("category-create");
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newCategory.name.trim(),
        color: newCategory.color,
      }),
    });
    setNewCategory({ name: "", color: "#8b5cf6" });
    setPendingAction(null);
    router.refresh();
  }

  async function saveCategory(category: Category) {
    const draft = getCategoryDraft(category);

    if (!draft.name.trim()) {
      return;
    }

    setPendingAction(`category-save-${category.id}`);
    await fetch(`/api/categories/${category.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim(),
        color: draft.color,
      }),
    });
    setPendingAction(null);
    setEditingCategoryId(null);
    router.refresh();
  }

  async function deleteCategory(category: Category) {
    const confirmed = window.confirm(`Delete "${category.name}"? ${t.dashboard.confirmDeleteCategorySuffix}`);

    if (!confirmed) {
      return;
    }

    setPendingAction(`category-delete-${category.id}`);
    await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    setPendingAction(null);
    router.refresh();
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80 sm:p-7">
          <div className="space-y-6">
            {/* Header content stays above the graph so the score trend can use the full card width. */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  <Sparkles size={15} /> {t.dashboard.badge}
                </p>
                <h1 className="max-w-4xl text-[clamp(2rem,4vw,3.25rem)] font-black leading-[1.05] tracking-tight text-gray-950">
                  {quoteText}
                </h1>
                {dashboardQuote.source ? (
                  <p className="mt-3 text-sm font-black uppercase tracking-wide text-gray-400">
                    {dashboardQuote.source}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 rounded-3xl bg-gray-950 p-4 text-white shadow-lg sm:text-right">
                <p className="text-sm text-white/70">{t.dashboard.trackedToday}</p>
                <p className="text-4xl font-black">{formatMinutes(totalToday)}</p>
              </div>
            </div>
            <ScoreTrendChart
              days={scoreTrendDays}
              periodDays={scorePeriodDays}
              onPeriodChange={setScorePeriodDays}
            />
          </div>
        </div>

        <SummaryPanel
          totalToday={totalToday}
          dailyTarget={dailyTarget}
          dailyTargetLabel={dailyTargetLabel}
          goalPercent={goalPercent}
          topCategory={topCategory}
          categoryStats={categoryStats}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <DailyTimeline
          entries={visibleTimelineEntries}
          plannedBlocks={visiblePlannedBlocks}
          activeTimer={activeTimer}
          categories={categories}
          timelineRange={timelineRange}
          onTimelineRangeChange={setTimelineRange}
        />
        <div className="space-y-6">
          <Charts categoryStats={categoryStats} totalToday={totalToday} />
          <RoutineStrip routines={routines} />
        </div>
      </section>

      <CategoryCards
        categories={categories}
        stats={categoryStats}
        activeTimer={activeTimer}
        pendingAction={pendingAction}
        editingCategoryId={editingCategoryId}
        getCategoryDraft={getCategoryDraft}
        updateCategoryDraft={updateCategoryDraft}
        onEditCategory={setEditingCategoryId}
        onSaveCategory={saveCategory}
        onDeleteCategory={deleteCategory}
        newCategory={newCategory}
        onNewCategoryChange={setNewCategory}
        onCreateCategory={createCategory}
        onStart={startTimer}
        onStop={stopTimer}
      />
    </div>
  );
}

function SummaryPanel({
  totalToday,
  dailyTarget,
  dailyTargetLabel,
  goalPercent,
  topCategory,
  categoryStats,
}: {
  totalToday: number;
  dailyTarget: { minutes: number; title: string };
  dailyTargetLabel: string;
  goalPercent: number;
  topCategory: CategoryStat | null;
  categoryStats: CategoryStat[];
}) {
  const { t } = useAppLanguage();

  return (
    <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">{t.dashboard.summary}</p>
          <h2 className="text-2xl font-black text-gray-950">
            {goalPercent}% {t.dashboard.ofGoal}
          </h2>
        </div>
        <div className="grid size-16 place-items-center rounded-full bg-gray-950 text-sm font-black text-white">
          {goalPercent}%
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${goalPercent}%` }} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label={t.dashboard.total} value={formatMinutes(totalToday)} />
        <Metric label={dailyTargetLabel} value={formatMinutes(dailyTarget.minutes)} />
      </div>
      <div className="mt-5">
        <p className="text-sm font-semibold text-gray-500">{t.dashboard.categoryDistribution}</p>
        <div className="mt-3 space-y-3">
          {categoryStats.map((stat) => (
            <div key={stat.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-semibold">{stat.name}</span>
                <span className="text-gray-500">{formatMinutes(stat.minutes)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${totalToday > 0 ? (stat.minutes / totalToday) * 100 : 0}%`,
                    backgroundColor: stat.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      {topCategory ? (
        <p className="mt-5 rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">
          {t.dashboard.strongestLanePrefix} <span className="font-bold text-gray-950">{topCategory.name}</span>.
        </p>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-black text-gray-950">{value}</p>
    </div>
  );
}

function DailyTimeline({
  entries,
  plannedBlocks,
  activeTimer,
  categories,
  timelineRange,
  onTimelineRangeChange,
}: {
  entries: Entry[];
  plannedBlocks: PlannedBlock[];
  activeTimer: ActiveTimer;
  categories: Category[];
  timelineRange: { startHour: number; endHour: number };
  onTimelineRangeChange: (range: { startHour: number; endHour: number }) => void;
}) {
  const router = useRouter();
  const { t } = useAppLanguage();
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isManualEntrySubmitting, setIsManualEntrySubmitting] = useState(false);
  const [manualEntry, setManualEntry] = useState(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(timelineRange.startHour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    return {
      title: "",
      notes: "",
      startTime: toDateTimeLocal(start),
      endTime: toDateTimeLocal(end),
      categoryId: "",
    };
  });
  const hours = Array.from(
    { length: timelineRange.endHour - timelineRange.startHour + 1 },
    (_, index) => timelineRange.startHour + index,
  );
  const hourOptions = Array.from({ length: 24 }, (_, index) => index);

  async function createManualEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!manualEntry.title.trim()) {
      return;
    }

    setIsManualEntrySubmitting(true);
    await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: manualEntry.title.trim(),
        notes: manualEntry.notes.trim() || null,
        startTime: manualEntry.startTime,
        endTime: manualEntry.endTime,
        categoryId: manualEntry.categoryId || null,
      }),
    });
    setIsManualEntrySubmitting(false);
    setIsManualEntryOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-500">{t.dashboard.dailyTimeline}</p>
          <h2 className="text-2xl font-black text-gray-950">{t.dashboard.timeBlocks}</h2>
        </div>
        <div className="relative flex flex-wrap items-center gap-2 rounded-3xl bg-rose-50 p-2 text-sm font-semibold text-rose-700">
          <select
            value={timelineRange.startHour}
            onChange={(event) => {
              const startHour = Number(event.target.value);
              onTimelineRangeChange({
                startHour,
                endHour: Math.max(startHour + 1, timelineRange.endHour),
              });
            }}
            className="rounded-2xl border border-rose-100 bg-white px-3 py-2 font-bold outline-none"
            title={t.dashboard.timelineStartTime}
          >
            {hourOptions.slice(0, 23).map((hour) => (
              <option key={hour} value={hour}>
                {formatHour(hour)}
              </option>
            ))}
          </select>
          <span>-</span>
          <select
            value={timelineRange.endHour}
            onChange={(event) => {
              const endHour = Number(event.target.value);
              onTimelineRangeChange({
                startHour: Math.min(timelineRange.startHour, endHour - 1),
                endHour,
              });
            }}
            className="rounded-2xl border border-rose-100 bg-white px-3 py-2 font-bold outline-none"
            title={t.dashboard.timelineEndTime}
          >
            {hourOptions.slice(1).map((hour) => (
              <option key={hour} value={hour}>
                {formatHour(hour)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsManualEntryOpen((current) => !current)}
            className="grid size-10 place-items-center rounded-full bg-gray-950 text-white shadow-sm transition hover:scale-105"
            title={t.dashboard.addManualEntry}
          >
            <Plus size={18} />
          </button>
          {isManualEntryOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.75rem)] z-20 w-[min(26rem,calc(100vw-2rem))] rounded-[2rem] border border-white/80 bg-white p-4 text-gray-700 shadow-2xl shadow-gray-300/60">
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-500">{t.common.manualEntry}</p>
                <h3 className="text-xl font-black text-gray-950">{t.dashboard.logTimeBlock}</h3>
              </div>
              <form onSubmit={(event) => void createManualEntry(event)} className="grid gap-3">
                <input
                  value={manualEntry.title}
                  onChange={(event) => setManualEntry({ ...manualEntry, title: event.target.value })}
                  placeholder={t.common.whatDidYouDo}
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                />
                <select
                  value={manualEntry.categoryId}
                  onChange={(event) => setManualEntry({ ...manualEntry, categoryId: event.target.value })}
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                >
                  <option value="">{t.common.noCategory}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={manualEntry.startTime}
                  onChange={(event) => setManualEntry({ ...manualEntry, startTime: event.target.value })}
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                />
                <input
                  type="datetime-local"
                  value={manualEntry.endTime}
                  onChange={(event) => setManualEntry({ ...manualEntry, endTime: event.target.value })}
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                />
                <input
                  value={manualEntry.notes}
                  onChange={(event) => setManualEntry({ ...manualEntry, notes: event.target.value })}
                  placeholder={t.common.optionalNotes}
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={isManualEntrySubmitting || !manualEntry.title.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <Plus size={17} />
                  {t.common.addEntry}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-[3rem_1fr] gap-3">
        <div className="relative h-[680px]">
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute right-0 -translate-y-2 text-xs font-semibold text-gray-400"
              style={{
                top: `${((hour - timelineRange.startHour) / (timelineRange.endHour - timelineRange.startHour)) * 100}%`,
              }}
            >
              {formatHour(hour)}
            </div>
          ))}
        </div>
        <div className="relative h-[680px] overflow-hidden rounded-3xl border border-gray-100 bg-gray-50">
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-white"
              style={{
                top: `${((hour - timelineRange.startHour) / (timelineRange.endHour - timelineRange.startHour)) * 100}%`,
              }}
            />
          ))}
          {plannedBlocks.map((block) => {
            const position = getTimeBlockPosition(block, timelineRange.startHour, timelineRange.endHour);
            const color = block.category?.color ?? "#64748b";

            return (
              <div
                key={block.id}
                className="absolute left-3 right-3 rounded-2xl border-2 border-dashed p-3 shadow-sm"
                style={{
                  top: `${position.top}%`,
                  height: `${position.height}%`,
                  minHeight: 48,
                  backgroundColor: withAlpha(color, "22"),
                  borderColor: withAlpha(color, "aa"),
                  color,
                }}
              >
                <p className="truncate text-sm font-black">{block.title}</p>
                <p className="text-xs font-semibold opacity-80">
                  {t.common.planned} {block.category ? `- ${block.category.name}` : ""}
                </p>
              </div>
            );
          })}
          {entries.map((entry) => {
            const position = getTimeBlockPosition(entry, timelineRange.startHour, timelineRange.endHour);
            const color = entry.category?.color ?? "#64748b";

            return (
              <div
                key={entry.id}
                className="absolute left-3 right-3 rounded-2xl p-3 text-white shadow-lg"
                style={{
                  top: `${position.top}%`,
                  height: `${position.height}%`,
                  minHeight: 48,
                  backgroundColor: color,
                }}
              >
                <p className="truncate text-sm font-black">{entry.title}</p>
                <p className="text-xs text-white/85">
                  {formatMinutes(entry.durationMinutes)} {entry.category ? `- ${entry.category.name}` : ""}
                </p>
              </div>
            );
          })}
          {activeTimer ? (
            <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/40 bg-gray-950 p-3 text-white shadow-lg">
              <p className="text-xs text-white/70">{t.dashboard.nowTracking}</p>
              <p className="truncate font-black">{activeTimer.title}</p>
            </div>
          ) : null}
          {entries.length === 0 && plannedBlocks.length === 0 ? (
            <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm font-medium text-gray-400">
              {t.dashboard.emptyTimeline}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Charts({
  categoryStats,
  totalToday,
}: {
  categoryStats: CategoryStat[];
  totalToday: number;
}) {
  const { t } = useAppLanguage();

  return (
    <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-500">{t.dashboard.pieChart}</p>
          <h2 className="text-xl font-black text-gray-950">{t.dashboard.byCategory}</h2>
          <div className="mt-4 space-y-2">
            {categoryStats.map((stat) => (
              <div key={stat.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-semibold">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: stat.color }} />
                  <span className="truncate">{stat.name}</span>
                </span>
                <span className="shrink-0 text-gray-500">{formatMinutes(stat.minutes)}</span>
              </div>
            ))}
          </div>
        </div>
        <div
          className="mx-auto grid size-52 shrink-0 place-items-center rounded-full sm:mx-0 sm:size-56 lg:size-64"
          style={{ background: getPieGradient(categoryStats, totalToday) }}
        >
          <div className="grid size-28 place-items-center rounded-full bg-white text-center shadow-inner sm:size-32">
            <span className="text-lg font-black">{formatMinutes(totalToday)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreTrendChart({
  days,
  periodDays,
  onPeriodChange,
}: {
  days: ScoreTrendDay[];
  periodDays: number;
  onPeriodChange: (days: number) => void;
}) {
  const { t } = useAppLanguage();
  // hoveredIndex drives the custom tooltip. Null means no point is currently hovered/focused.
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // Fixed viewBox dimensions make the SVG predictable; CSS still scales it to the card width.
  const width = 640;
  const height = 280;
  // Padding creates room for y-axis labels and x-axis day letters inside the SVG.
  const padding = { top: 26, right: 18, bottom: 42, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  // Average and total are period-level summaries, not lifetime user scores.
  const averageScore =
    Math.round((days.reduce((sum, day) => sum + day.score, 0) / Math.max(1, days.length)) * 10) / 10;
  const totalScore = Math.round(days.reduce((sum, day) => sum + day.score, 0) * 10) / 10;
  const points = days.map((day, index) => {
    // SVG uses pixels, so convert 0-10 scores into x/y coordinates inside the chart padding.
    const x = padding.left + (days.length === 1 ? chartWidth / 2 : (index / (days.length - 1)) * chartWidth);
    const y = padding.top + ((10 - day.score) / 10) * chartHeight;

    return { ...day, x, y };
  });
  // The trend line is a simple polyline path through each daily score point.
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const averageY = padding.top + ((10 - averageScore) / 10) * chartHeight;
  const hoveredPoint = hoveredIndex === null ? null : points[hoveredIndex];

  return (
    <div className="relative rounded-3xl bg-gray-950 p-4 text-white shadow-xl shadow-gray-300/50">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white/55">{t.dashboard.scoreTrend}</p>
          <h2 className="text-3xl font-black tracking-tight text-white">
            {totalScore} {t.dashboard.points}
          </h2>
          <p className="mt-1 text-xs font-bold text-white/45">
            {t.dashboard.avg} {averageScore}/10
          </p>
        </div>
        <select
          value={periodDays}
          onChange={(event) => onPeriodChange(Number(event.target.value))}
          className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white outline-none transition hover:bg-white/15"
          title={t.dashboard.scoreTrendPeriod}
        >
          {scorePeriodOptions.map((option) => (
            <option key={option} value={option} className="bg-gray-950 text-white">
              {option} {t.dashboard.days}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <svg className="h-[17rem] w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img">
          {[0, 2, 4, 6, 8, 10].map((value) => {
            // Convert score label values into horizontal grid lines on the same 0-10 scale as the points.
            const y = padding.top + ((10 - value) / 10) * chartHeight;

            return (
              <g key={value}>
                <text x={12} y={y + 5} className="fill-white/35 text-[18px] font-black">
                  {value}
                </text>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-white/12"
                  strokeWidth={2}
                />
              </g>
            );
          })}

          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={averageY}
            y2={averageY}
            stroke="currentColor"
            className="text-emerald-300/70"
            strokeDasharray="8 8"
            strokeWidth={3}
          />
          {/* Average line lets the user compare each day against the selected period, not only against 10/10. */}
          <text
            x={width - padding.right - 70}
            y={Math.max(16, averageY - 8)}
            className="fill-emerald-200/90 text-[13px] font-black"
          >
            {t.common.average}
          </text>

          <path d={path} fill="none" stroke="#60a5fa" strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} />

          {points.map((point, index) => (
            <g key={point.key}>
              {/* A wide invisible hit area makes hover easier than aiming exactly at the circle. */}
              <line
                x1={point.x}
                x2={point.x}
                y1={padding.top}
                y2={height - padding.bottom}
                stroke="transparent"
                strokeWidth={Math.max(22, chartWidth / Math.max(1, points.length))}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(index)}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={hoveredIndex === index ? 10 : 7}
                fill="#7dd3fc"
                stroke="#111827"
                strokeWidth={3}
                className="transition-all"
              />
              <text
                x={point.x}
                y={height - 10}
                textAnchor="middle"
                className="fill-white/40 text-[20px] font-black"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>

        {hoveredPoint ? (
          <div
            className="pointer-events-none absolute z-10 w-56 rounded-2xl border border-white/10 bg-white p-3 text-gray-800 shadow-2xl shadow-gray-950/20"
            style={{
              left: `clamp(7rem, ${(hoveredPoint.x / width) * 100}%, calc(100% - 7rem))`,
              top: `${(hoveredPoint.y / height) * 100}%`,
              // Low points open upward so the tooltip is not cut off by the bottom of the chart.
              transform: hoveredPoint.y > height * 0.58 ? "translate(-50%, calc(-100% - 14px))" : "translate(-50%, 14px)",
            }}
          >
            <p className="text-xs font-black uppercase text-gray-400">{hoveredPoint.dateLabel}</p>
            <p className="mt-1 text-2xl font-black text-gray-950">{hoveredPoint.score}/10</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-bold text-gray-500">
              <span>{t.common.actual}</span>
              <span className="text-right text-gray-800">{formatMinutes(hoveredPoint.actualMinutes)}</span>
              <span>{t.common.planned}</span>
              <span className="text-right text-gray-800">{formatMinutes(hoveredPoint.plannedMinutes)}</span>
              <span>{t.common.entries}</span>
              <span className="text-right text-gray-800">{hoveredPoint.entryCount}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${hoveredPoint.percent}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs font-bold text-white/40">
        <span>{t.common.dailyScore}</span>
        <span>{t.common.plannedVsActual}</span>
      </div>
    </div>
  );
}

function RoutineStrip({ routines }: { routines: Routine[] }) {
  const { t } = useAppLanguage();

  return (
    <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80">
      <p className="text-sm font-semibold text-gray-500">{t.dashboard.routines}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {routines.slice(0, 2).map((routine) => (
          <div key={routine.id} className="rounded-2xl bg-gray-50 p-4">
            <p className="font-black text-gray-950">{routine.title}</p>
            <p className="mt-1 font-mono text-sm text-gray-500">{routine.timeOfDay}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryCards({
  categories,
  stats,
  activeTimer,
  pendingAction,
  editingCategoryId,
  getCategoryDraft,
  updateCategoryDraft,
  onEditCategory,
  onSaveCategory,
  onDeleteCategory,
  newCategory,
  onNewCategoryChange,
  onCreateCategory,
  onStart,
  onStop,
}: {
  categories: Category[];
  stats: CategoryStat[];
  activeTimer: ActiveTimer;
  pendingAction: string | null;
  editingCategoryId: string | null;
  getCategoryDraft: (category: Category) => Category;
  updateCategoryDraft: (category: Category, patch: Partial<Category>) => void;
  onEditCategory: (categoryId: string | null) => void;
  onSaveCategory: (category: Category) => Promise<void>;
  onDeleteCategory: (category: Category) => Promise<void>;
  newCategory: { name: string; color: string };
  onNewCategoryChange: (category: { name: string; color: string }) => void;
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onStart: (category: Category) => Promise<void>;
  onStop: () => Promise<void>;
}) {
  const { t } = useAppLanguage();

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-500">{t.dashboard.quickTracking}</p>
          <h2 className="text-2xl font-black tracking-tight text-gray-950">{t.dashboard.categoryCards}</h2>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const stat = stats.find((item) => item.id === category.id);
          const isActive = activeTimer?.category?.id === category.id;
          const isEditing = editingCategoryId === category.id;
          const draft = getCategoryDraft(category);

          return (
            <article
              key={category.id}
              className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-xl shadow-gray-200/70"
            >
              <div className="p-5 text-white" style={{ backgroundColor: category.color }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-black">{category.name}</h3>
                    <p className="mt-1 text-sm text-white/80">
                      {formatMinutes(stat?.minutes ?? 0)} {t.common.today}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                    {stat?.entries ?? 0} {t.dashboard.logs}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <p className="text-sm font-semibold text-gray-500">
                  {isActive ? t.dashboard.runningNow : t.dashboard.readyWhenYouAre}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEditCategory(isEditing ? null : category.id)}
                    className="grid size-10 place-items-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200"
                    title={`${t.dashboard.editCategory}: ${category.name}`}
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => (isActive ? onStop() : onStart(category))}
                    disabled={pendingAction !== null || (!!activeTimer && !isActive)}
                    className="grid size-12 place-items-center rounded-full bg-gray-950 text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:bg-gray-300"
                    title={isActive ? t.dashboard.stopTimer : `${t.dashboard.startCategory}: ${category.name}`}
                  >
                    {isActive ? <CircleStop size={21} /> : <Play size={21} fill="currentColor" />}
                  </button>
                </div>
              </div>
              {isEditing ? (
                <div className="space-y-3 border-t border-gray-100 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      value={draft.name}
                      onChange={(event) => updateCategoryDraft(category, { name: event.target.value })}
                      className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                    />
                    <input
                      type="color"
                      value={draft.color}
                      onChange={(event) => updateCategoryDraft(category, { color: event.target.value })}
                      className="h-12 w-full cursor-pointer rounded-2xl border border-gray-200 bg-white p-1 sm:w-16"
                      title={t.dashboard.categoryColor}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(category)}
                      disabled={pendingAction !== null}
                      className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      {t.common.delete}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSaveCategory(category)}
                      disabled={pendingAction !== null}
                      className="inline-flex items-center gap-2 rounded-full bg-gray-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
                    >
                      <Save size={16} />
                      {t.common.save}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <form
        onSubmit={(event) => void onCreateCategory(event)}
        className="mt-5 rounded-[2rem] border border-dashed border-gray-300 bg-white/80 p-4 shadow-sm"
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-500">
          <Palette size={17} />
          {t.dashboard.addCustomizeCategories}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={newCategory.name}
            onChange={(event) => onNewCategoryChange({ ...newCategory, name: event.target.value })}
            placeholder={t.dashboard.newCategoryName}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400"
          />
          <input
            type="color"
            value={newCategory.color}
            onChange={(event) => onNewCategoryChange({ ...newCategory, color: event.target.value })}
            className="h-12 w-full cursor-pointer rounded-2xl border border-gray-200 bg-white p-1 sm:w-16"
            title={t.dashboard.newCategoryColor}
          />
          <button
            type="submit"
            disabled={pendingAction !== null || !newCategory.name.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Plus size={17} />
            {t.common.add}
          </button>
        </div>
      </form>
    </section>
  );
}
