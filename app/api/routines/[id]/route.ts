import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

// Item route for one routine. Next.js App Router provides params asynchronously in this project setup.
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const routine = await prisma.routine.findUnique({ where: { id } });

  if (!routine) {
    return NextResponse.json({ error: "Routine not found" }, { status: 404 });
  }

  return NextResponse.json(routine);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();

  // PUT is used by both the settings panel and the quick active/disabled pill.
  // For now the client sends the whole routine payload, so this update replaces all editable fields together.
  const routine = await prisma.routine.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description ?? null,
      timeOfDay: body.timeOfDay || "08:00",
      // days is stored as JSON in MySQL. Normalize short/old labels into full uppercase names.
      days: normalizeDays(body.days),
      isActive: body.isActive,
    },
  });

  return NextResponse.json(routine);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  // Routine rows are independent; deleting one does not need cascading cleanup elsewhere.
  await prisma.routine.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
