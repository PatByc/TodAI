import { prisma } from "@/lib/prisma";
import { ManualEntryForm } from "@/components/manual-entry-form";
import { LocalizedText } from "@/components/LocalizedText";

export const dynamic = "force-dynamic";

type HistoryPageProps = {
  searchParams: Promise<{
    start?: string;
    end?: string;
  }>;
};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultRange() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

function parseRange(startValue?: string, endValue?: string) {
  const defaults = getDefaultRange();
  const start = startValue ? new Date(`${startValue}T00:00:00`) : defaults.start;
  const end = endValue ? new Date(`${endValue}T23:59:59.999`) : defaults.end;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return defaults;
  }

  return { start, end };
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function formatDay(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDaysInRange(start: Date, end: Date) {
  const days: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const final = new Date(end);
  final.setHours(0, 0, 0, 0);

  while (cursor <= final) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function getSuccessScore(actualMinutes: number, plannedMinutes: number) {
  if (plannedMinutes <= 0) {
    return {
      score: actualMinutes > 0 ? 5 : 0,
      percent: actualMinutes > 0 ? 50 : 0,
    };
  }

  const percent = Math.min(100, Math.round((actualMinutes / plannedMinutes) * 100));
  return {
    score: Math.round((percent / 10) * 10) / 10,
    percent,
  };
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const { start, end } = parseRange(params.start, params.end);
  const [entries, plannedBlocks, categories] = await Promise.all([
    prisma.entry.findMany({
      where: {
        startTime: {
          gte: start,
          lte: end,
        },
      },
      include: { category: true },
      orderBy: { startTime: "desc" },
    }),
    prisma.plannedBlock.findMany({
      where: {
        startTime: {
          gte: start,
          lte: end,
        },
      },
      include: { category: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const days = getDaysInRange(start, end);
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const dailyTotals = days.map((day) => {
    const key = getDayKey(day);
    const minutes = entries
      .filter((entry) => getDayKey(entry.startTime) === key)
      .reduce((sum, entry) => sum + entry.durationMinutes, 0);
    const plannedMinutes = plannedBlocks
      .filter((block) => getDayKey(block.startTime) === key)
      .reduce((sum, block) => sum + Math.max(0, Math.round((block.endTime.getTime() - block.startTime.getTime()) / 60000)), 0);
    const success = getSuccessScore(minutes, plannedMinutes);

    return {
      key,
      label: formatDay(day),
      minutes,
      plannedMinutes,
      score: success.score,
      percent: success.percent,
    };
  });
  const maxDailyMinutes = Math.max(60, ...dailyTotals.map((day) => day.minutes));
  const averageScore = Math.round((dailyTotals.reduce((sum, day) => sum + day.score, 0) / Math.max(1, dailyTotals.length)) * 10) / 10;
  const byCategory = entries.reduce<Record<string, { minutes: number; entries: number; color: string }>>((acc, entry) => {
    const key = entry.category?.name ?? "Uncategorized";
    const current = acc[key] ?? {
      minutes: 0,
      entries: 0,
      color: entry.category?.color ?? "#64748b",
    };

    current.minutes += entry.durationMinutes;
    current.entries += 1;
    acc[key] = current;

    return acc;
  }, {});
  const categoryRows = Object.entries(byCategory).sort(([, a], [, b]) => b.minutes - a.minutes);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80 sm:p-7">
        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-500">
            <LocalizedText en="History" pl="Historia" />
          </p>
          <h1 className="text-3xl font-black tracking-tight text-gray-950">
            <LocalizedText en="Review previous days" pl="Przejrzyj poprzednie dni" />
          </h1>
        </div>
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            type="date"
            name="start"
            defaultValue={toDateInputValue(start)}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
          />
          <input
            type="date"
            name="end"
            defaultValue={toDateInputValue(end)}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
          />
          <button className="rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800">
            <LocalizedText en="Update range" pl="Zmień zakres" />
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label={<LocalizedText en="Tracked time" pl="Zarejestrowany czas" />} value={formatMinutes(totalMinutes)} />
        <SummaryCard label={<LocalizedText en="Entries" pl="Wpisy" />} value={String(entries.length)} />
        <SummaryCard label={<LocalizedText en="Avg success score" pl="Średni wynik sukcesu" />} value={`${averageScore}/10`} />
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80">
        <p className="text-sm font-semibold text-gray-500">
          <LocalizedText en="Success score" pl="Wynik sukcesu" />
        </p>
        <h2 className="text-xl font-black text-gray-950">
          <LocalizedText en="Planned vs actual day" pl="Plan kontra wykonanie dnia" />
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2"><LocalizedText en="Day" pl="Dzień" /></th>
                <th className="py-2"><LocalizedText en="Planned" pl="Planowane" /></th>
                <th className="py-2"><LocalizedText en="Actual" pl="Wykonane" /></th>
                <th className="py-2"><LocalizedText en="Score" pl="Wynik" /></th>
                <th className="py-2"><LocalizedText en="Normalized" pl="Znormalizowane" /></th>
              </tr>
            </thead>
            <tbody>
              {dailyTotals.map((day) => (
                <tr key={day.key} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 font-semibold">{day.label}</td>
                  <td className="py-3 pr-4">{formatMinutes(day.plannedMinutes)}</td>
                  <td className="py-3 pr-4">{formatMinutes(day.minutes)}</td>
                  <td className="py-3 pr-4 font-black text-gray-950">{day.score}/10</td>
                  <td className="py-3">
                    <div className="flex min-w-40 items-center gap-3">
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${day.percent}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs font-bold text-gray-500">{day.percent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs font-semibold text-gray-400">
          <LocalizedText
            en="Score is based on actual tracked minutes compared with planned minutes for the same day."
            pl="Wynik bazuje na zapisanych minutach porównanych z planowanymi minutami z tego samego dnia."
          />
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80">
          <p className="text-sm font-semibold text-gray-500">
            <LocalizedText en="Daily totals" pl="Suma dzienna" />
          </p>
          <h2 className="text-xl font-black text-gray-950">
            <LocalizedText en="Selected range" pl="Wybrany zakres" />
          </h2>
          <div className="mt-5 space-y-3">
            {dailyTotals.map((day) => (
              <div key={day.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700">{day.label}</span>
                  <span className="font-bold text-gray-500">
                    {formatMinutes(day.minutes)} / {formatMinutes(day.plannedMinutes)}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gray-950"
                    style={{ width: `${Math.max(3, (day.minutes / maxDailyMinutes) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80">
          <p className="text-sm font-semibold text-gray-500">
            <LocalizedText en="Category summary" pl="Podsumowanie kategorii" />
          </p>
          <h2 className="text-xl font-black text-gray-950">
            <LocalizedText en="Where time went" pl="Na co poszedł czas" />
          </h2>
          <div className="mt-5 space-y-3">
            {categoryRows.map(([name, category]) => (
              <div key={name} className="rounded-2xl bg-gray-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 font-bold">
                    <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="truncate">
                      {name === "Uncategorized" ? <LocalizedText en="Uncategorized" pl="Bez kategorii" /> : name}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-gray-500">{formatMinutes(category.minutes)}</span>
                </div>
                <p className="text-xs font-semibold text-gray-400">
                  {category.entries} <LocalizedText en="entries" pl="wpisy" />
                </p>
              </div>
            ))}
            {categoryRows.length === 0 ? (
              <p className="text-sm text-gray-500">
                <LocalizedText en="No tracked time in this range." pl="Brak zarejestrowanego czasu w tym zakresie." />
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Manual entry now lives in History because this page is where past tracked time is reviewed and corrected. */}
      <ManualEntryForm
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          color: category.color,
        }))}
      />

      <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80">
        <p className="text-sm font-semibold text-gray-500">
          <LocalizedText en="Entries" pl="Wpisy" />
        </p>
        <h2 className="text-xl font-black text-gray-950">
          <LocalizedText en="Range detail" pl="Szczegóły zakresu" />
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2"><LocalizedText en="Title" pl="Tytuł" /></th>
                <th className="py-2"><LocalizedText en="Category" pl="Kategoria" /></th>
                <th className="py-2"><LocalizedText en="Start" pl="Start" /></th>
                <th className="py-2"><LocalizedText en="Finish" pl="Koniec" /></th>
                <th className="py-2"><LocalizedText en="Duration" pl="Czas trwania" /></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4 font-semibold">{entry.title}</td>
                  <td className="py-2 pr-4">{entry.category?.name ?? "-"}</td>
                  <td className="py-2 pr-4">{entry.startTime.toLocaleString()}</td>
                  <td className="py-2 pr-4">{entry.endTime ? entry.endTime.toLocaleString() : "-"}</td>
                  <td className="py-2">{formatMinutes(entry.durationMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 ? (
            <p className="py-4 text-sm text-gray-500">
              <LocalizedText en="No entries in this range." pl="Brak wpisów w tym zakresie." />
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-gray-950">{value}</p>
    </div>
  );
}
