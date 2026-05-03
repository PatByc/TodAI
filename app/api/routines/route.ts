import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

// Collection route for routines:
// - GET returns every routine for the local app user context.
// - POST creates one routine from the form on /routines.
// Authentication is intentionally not here yet; the app currently behaves as a local single-user app.
export async function GET() {
  // Sort by time so morning routines naturally appear before evening routines in the UI.
  const routines = await prisma.routine.findMany({ orderBy: { timeOfDay: "asc" } });
  return NextResponse.json(routines);
}

export async function POST(request: Request) {
  const body = await request.json();

  // Normalize optional fields at the API boundary so the Prisma model receives predictable values.
  // This keeps client forms simple and protects future clients from sending malformed "days" values.
  const routine = await prisma.routine.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      timeOfDay: body.timeOfDay || "08:00",
      days: normalizeDays(body.days),
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json(routine, { status: 201 });
}
