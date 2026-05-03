export type StatsPeriod = "today" | "week" | "month";

export function getPeriodStart(period: StatsPeriod) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    const day = start.getDay();
    const offset = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - offset);
  }

  if (period === "month") {
    start.setDate(1);
  }

  return start;
}

export function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60000));
}
