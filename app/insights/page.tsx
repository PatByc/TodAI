import { prisma } from "@/lib/prisma";
import { getPeriodStart } from "@/lib/dates";
import { Panel, Section } from "@/components/section";

export const dynamic = "force-dynamic";

// Small aggregate helper used by the summary cards.
// It returns total tracked minutes and entry count for the requested period.
async function getTotal(period: "today" | "week" | "month") {
  const result = await prisma.entry.aggregate({
    where: { startTime: { gte: getPeriodStart(period) } },
    _sum: { durationMinutes: true },
    _count: true,
  });

  return {
    minutes: result._sum.durationMinutes ?? 0,
    entries: result._count,
  };
}

// Temporary static leaderboard data. Replace this with real users/profiles once multi-user support exists.
// height is kept separate from score so a future design can choose a different visual scale without changing labels.
const leaderboardPlaceholder = [
  { name: "Patryk", score: 8.4, height: 84 },
  { name: "Alex", score: 7.6, height: 76 },
  { name: "Maya", score: 6.9, height: 69 },
  { name: "Noah", score: 5.8, height: 58 },
  { name: "Lena", score: 4.7, height: 47 },
];

export default async function InsightsPage() {
  // These three aggregates are independent, so load them in parallel for a faster server response.
  const [today, week, month] = await Promise.all([
    getTotal("today"),
    getTotal("week"),
    getTotal("month"),
  ]);

  return (
    <Section title="Insights">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Panel>
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-3xl font-semibold">{today.minutes} min</p>
            <p className="text-sm text-gray-500">{today.entries} entries</p>
          </Panel>
          <Panel>
            <p className="text-sm text-gray-500">This week</p>
            <p className="text-3xl font-semibold">{week.minutes} min</p>
            <p className="text-sm text-gray-500">{week.entries} entries</p>
          </Panel>
          <Panel>
            <p className="text-sm text-gray-500">This month</p>
            <p className="text-3xl font-semibold">{month.minutes} min</p>
            <p className="text-sm text-gray-500">{month.entries} entries</p>
          </Panel>
        </div>

        <Panel>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-500">Future graph</p>
              <h2 className="text-2xl font-black text-gray-950">Users leaderboard</h2>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase text-gray-500">
              Placeholder
            </span>
          </div>

          {/* Placeholder only: future work can replace this static sample with real user leaderboard data. */}
          <div className="grid gap-4 lg:grid-cols-[1fr_14rem]">
            <div className="flex h-72 items-end gap-3 rounded-3xl bg-gray-50 p-4">
              {leaderboardPlaceholder.map((user, index) => (
                <div key={user.name} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-52 w-full items-end rounded-full bg-white p-1 shadow-inner">
                    {/* Bar height is a visual placeholder only; score is still shown explicitly as /10. */}
                    <div
                      className="w-full rounded-full bg-gray-950 transition"
                      style={{ height: `${user.height}%` }}
                      title={`${user.name}: ${user.score}/10`}
                    />
                  </div>
                  <span className="w-full truncate text-center text-xs font-black text-gray-500">
                    {index + 1}. {user.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {leaderboardPlaceholder.map((user, index) => (
                <div key={user.name} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3">
                  <span className="min-w-0 truncate text-sm font-bold text-gray-700">
                    {index + 1}. {user.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-black text-gray-950 shadow-sm">
                    {user.score}/10
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs font-semibold text-gray-400">
            This is reserved for a future users leaderboard once user profiles and comparison data exist.
          </p>
        </Panel>
      </div>
    </Section>
  );
}
