import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDurationMinutes } from "@/lib/dates";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const entry = await prisma.entry.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json(entry);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const existing = await prisma.entry.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const startTime = body.startTime ? new Date(body.startTime) : existing.startTime;
  const endTime = body.endTime === undefined ? existing.endTime : body.endTime ? new Date(body.endTime) : null;

  const entry = await prisma.entry.update({
    where: { id },
    data: {
      title: body.title ?? existing.title,
      notes: body.notes === undefined ? existing.notes : body.notes,
      startTime,
      endTime,
      durationMinutes:
        body.durationMinutes ?? (endTime ? getDurationMinutes(startTime, endTime) : existing.durationMinutes),
      categoryId: body.categoryId === undefined ? existing.categoryId : body.categoryId,
    },
    include: { category: true },
  });

  return NextResponse.json(entry);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await prisma.entry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
