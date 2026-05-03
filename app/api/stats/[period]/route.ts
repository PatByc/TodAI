import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPeriodStart, type StatsPeriod } from "@/lib/dates";

type RouteContext = {
  params: Promise<{ period: string }>;
};

const periods = new Set(["today", "week", "month"]);

export async function GET(_request: Request, context: RouteContext) {
  const { period } = await context.params;

  if (!periods.has(period)) {
    return NextResponse.json({ error: "Period must be today, week, or month" }, { status: 400 });
  }

  const start = getPeriodStart(period as StatsPeriod);
  const entries = await prisma.entry.findMany({
    where: { startTime: { gte: start } },
    include: { category: true },
    orderBy: { startTime: "desc" },
  });

  const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const byCategory = entries.reduce<Record<string, { minutes: number; entries: number; color: string | null }>>(
    (acc, entry) => {
      const key = entry.category?.name ?? "Uncategorized";
      const current = acc[key] ?? { minutes: 0, entries: 0, color: entry.category?.color ?? null };
      current.minutes += entry.durationMinutes;
      current.entries += 1;
      acc[key] = current;
      return acc;
    },
    {},
  );

  return NextResponse.json({
    period,
    start,
    totalMinutes,
    entryCount: entries.length,
    byCategory,
    entries,
  });
}
