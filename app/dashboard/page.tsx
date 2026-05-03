import { prisma } from "@/lib/prisma";
import { getPeriodStart } from "@/lib/dates";
import { DashboardClient } from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

// Prisma Date and relation objects cannot be passed directly into a client component.
// Keep only the category fields the UI actually renders.
function serializeCategory(category: { id: string; name: string; color: string } | null) {
  return category
    ? {
        id: category.id,
        name: category.name,
        color: category.color,
      }
    : null;
}

export default async function DashboardPage() {
  const todayStart = getPeriodStart("today");
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  // Fetch enough history for the dashboard score chart. The client can then switch 7/14/30 days instantly.
  const trendStart = new Date(todayStart);
  trendStart.setDate(trendStart.getDate() - 29);

  const [
    activeTimer,
    todayEntries,
    plannedBlocks,
    scoreEntries,
    scorePlannedBlocks,
    categories,
    goals,
    routines,
  ] = await Promise.all([
    // Active timer is shown in the timeline and also mirrored by the global sidebar timer widget.
    prisma.activeTimer.findFirst({ include: { category: true } }),
    // Today entries feed the hero totals, summary panel, pie chart, and current daily timeline.
    prisma.entry.findMany({
      where: { startTime: { gte: todayStart, lt: tomorrowStart } },
      include: { category: true },
      orderBy: { startTime: "desc" },
    }),
    // Today planned blocks are rendered as dim/dashed blocks on the dashboard timeline.
    prisma.plannedBlock.findMany({
      where: { startTime: { gte: todayStart, lt: tomorrowStart } },
      include: { category: true },
      orderBy: { startTime: "asc" },
    }),
    // Trend queries intentionally fetch the larger 30-day range once; period filtering happens in the client.
    prisma.entry.findMany({
      where: { startTime: { gte: trendStart, lt: tomorrowStart } },
      include: { category: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.plannedBlock.findMany({
      where: { startTime: { gte: trendStart, lt: tomorrowStart } },
      include: { category: true },
      orderBy: { startTime: "asc" },
    }),
    // Categories/goals/routines are small lookup tables used to decorate dashboard panels.
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.goal.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } }),
    prisma.routine.findMany({ where: { isActive: true }, orderBy: { timeOfDay: "asc" } }),
  ]);

  return (
    <DashboardClient
      activeTimer={
        activeTimer
          ? {
              id: activeTimer.id,
              title: activeTimer.title,
              notes: activeTimer.notes,
              startedAt: activeTimer.startedAt.toISOString(),
              category: serializeCategory(activeTimer.category),
            }
          : null
      }
      todayEntries={todayEntries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        notes: entry.notes,
        startTime: entry.startTime.toISOString(),
        endTime: entry.endTime?.toISOString() ?? null,
        durationMinutes: entry.durationMinutes,
        category: serializeCategory(entry.category),
      }))}
      scoreEntries={scoreEntries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        notes: entry.notes,
        startTime: entry.startTime.toISOString(),
        endTime: entry.endTime?.toISOString() ?? null,
        durationMinutes: entry.durationMinutes,
        category: serializeCategory(entry.category),
      }))}
      plannedBlocks={plannedBlocks.map((block) => ({
        id: block.id,
        title: block.title,
        notes: block.notes,
        startTime: block.startTime.toISOString(),
        endTime: block.endTime.toISOString(),
        category: serializeCategory(block.category),
      }))}
      scorePlannedBlocks={scorePlannedBlocks.map((block) => ({
        id: block.id,
        title: block.title,
        notes: block.notes,
        startTime: block.startTime.toISOString(),
        endTime: block.endTime.toISOString(),
        category: serializeCategory(block.category),
      }))}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
      }))}
      goals={goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        targetMinutes: goal.targetMinutes,
        period: goal.period,
      }))}
      routines={routines.map((routine) => ({
        id: routine.id,
        title: routine.title,
        timeOfDay: routine.timeOfDay,
      }))}
    />
  );
}
