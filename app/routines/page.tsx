import { prisma } from "@/lib/prisma";
import { RoutinesClient } from "@/components/routines-client";

export const dynamic = "force-dynamic";

const dayAliases: Record<string, string> = {
  MON: "MONDAY",
  MONDAY: "MONDAY",
  TUE: "TUESDAY",
  TUESDAY: "TUESDAY",
  WED: "WEDNESDAY",
  WEDNESDAY: "WEDNESDAY",
  THU: "THURSDAY",
  THURSDAY: "THURSDAY",
  FRI: "FRIDAY",
  FRIDAY: "FRIDAY",
  SAT: "SATURDAY",
  SATURDAY: "SATURDAY",
  SUN: "SUNDAY",
  SUNDAY: "SUNDAY",
};

// Routine.days is JSON in Prisma/MySQL. This helper guarantees the client receives a clean string[].
function normalizeDays(days: unknown) {
  if (!Array.isArray(days)) {
    return [];
  }

  return Array.from(
    new Set(
      days
        .filter((day): day is string => typeof day === "string")
        .map((day) => dayAliases[day.trim().toUpperCase()])
        .filter((day): day is string => Boolean(day)),
    ),
  );
}

export default async function RoutinesPage() {
  // The page stays server-rendered for initial data; interactive add/edit/delete lives in RoutinesClient.
  const routines = await prisma.routine.findMany({ orderBy: { timeOfDay: "asc" } });

  return (
    <RoutinesClient
      routines={routines.map((routine) => ({
        id: routine.id,
        title: routine.title,
        description: routine.description,
        timeOfDay: routine.timeOfDay,
        days: normalizeDays(routine.days),
        isActive: routine.isActive,
      }))}
    />
  );
}
