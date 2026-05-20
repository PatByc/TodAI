import { prisma } from "@/lib/prisma";
import { getPeriodStart } from "@/lib/dates";

type PeriodName = "today" | "week" | "month";

type EntryWithCategory = {
  id: string;
  title: string;
  notes: string | null;
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number;
  category: {
    id: string;
    name: string;
    color: string;
  } | null;
};

const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function aggregateByCategory(entries: EntryWithCategory[]) {
  return entries.reduce<Record<string, { minutes: number; entries: number; color: string | null }>>((acc, entry) => {
    const name = entry.category?.name ?? "Uncategorized";
    const current = acc[name] ?? {
      minutes: 0,
      entries: 0,
      color: entry.category?.color ?? null,
    };

    current.minutes += entry.durationMinutes;
    current.entries += 1;
    acc[name] = current;

    return acc;
  }, {});
}

function aggregateDailyTotals(entries: EntryWithCategory[]) {
  const totals = dayLabels.reduce<Record<string, number>>((acc, label) => {
    acc[label] = 0;
    return acc;
  }, {});

  entries.forEach((entry) => {
    totals[dayLabels[entry.startTime.getDay()]] += entry.durationMinutes;
  });

  return totals;
}

function totalMinutes(entries: EntryWithCategory[]) {
  return entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
}

function getEntriesForGoalPeriod(entriesByPeriod: Record<PeriodName, EntryWithCategory[]>, period: string) {
  if (period === "DAILY") {
    return entriesByPeriod.today;
  }

  if (period === "MONTHLY") {
    return entriesByPeriod.month;
  }

  return entriesByPeriod.week;
}

export async function getUserTimeContext(_userId: string) {
  const [todayEntries, weekEntries, monthEntries, activeTimer, goals, recentEntries, openTasks, recentCompletedTasks] = await Promise.all([
    prisma.entry.findMany({
      where: { startTime: { gte: getPeriodStart("today") } },
      include: { category: true },
      orderBy: { startTime: "desc" },
    }),
    prisma.entry.findMany({
      where: { startTime: { gte: getPeriodStart("week") } },
      include: { category: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.entry.findMany({
      where: { startTime: { gte: getPeriodStart("month") } },
      include: { category: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.activeTimer.findFirst({ include: { category: true } }),
    prisma.goal.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } }),
    prisma.entry.findMany({
      take: 20,
      include: { category: true },
      orderBy: { startTime: "desc" },
    }),
    prisma.task.findMany({
      where: { isCompleted: false },
      take: 20,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.task.findMany({
      where: { isCompleted: true },
      take: 10,
      orderBy: { completedAt: "desc" },
    }),
  ]);

  const entriesByPeriod = {
    today: todayEntries,
    week: weekEntries,
    month: monthEntries,
  };

  return {
    today: {
      totalMinutes: totalMinutes(todayEntries),
      byCategory: aggregateByCategory(todayEntries),
    },
    week: {
      totalMinutes: totalMinutes(weekEntries),
      byCategory: aggregateByCategory(weekEntries),
      dailyTotals: aggregateDailyTotals(weekEntries),
    },
    month: {
      totalMinutes: totalMinutes(monthEntries),
      byCategory: aggregateByCategory(monthEntries),
    },
    activeTimer: activeTimer
      ? {
          title: activeTimer.title,
          notes: activeTimer.notes,
          startedAt: activeTimer.startedAt.toISOString(),
          category: activeTimer.category?.name ?? null,
        }
      : null,
    goals: goals.map((goal) => {
      const periodEntries = getEntriesForGoalPeriod(entriesByPeriod, goal.period);
      const progressMinutes = totalMinutes(periodEntries);

      return {
        title: goal.title,
        description: goal.description,
        period: goal.period,
        targetMinutes: goal.targetMinutes,
        progressMinutes,
        percentComplete: Math.min(100, Math.round((progressMinutes / goal.targetMinutes) * 100)),
      };
    }),
    recentEntries: recentEntries.map((entry) => ({
      title: entry.title,
      notes: entry.notes,
      startTime: entry.startTime.toISOString(),
      endTime: entry.endTime?.toISOString() ?? null,
      durationMinutes: entry.durationMinutes,
      category: entry.category?.name ?? null,
    })),
    tasks: {
      open: openTasks.map((task) => ({
        title: task.title,
        notes: task.notes,
        dueDate: task.dueDate?.toISOString() ?? null,
      })),
      recentlyCompleted: recentCompletedTasks.map((task) => ({
        title: task.title,
        notes: task.notes,
        dueDate: task.dueDate?.toISOString() ?? null,
        completedAt: task.completedAt?.toISOString() ?? null,
      })),
    },
  };
}
