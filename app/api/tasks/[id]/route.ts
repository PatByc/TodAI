import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseDueDateForUpdate(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !value) {
    return null;
  }

  // Task dates intentionally have no clock time; the UI treats this as the target day.
  return new Date(`${value}T00:00:00`);
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const task = await prisma.task.findUnique({ where: { id } });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const isCompleted = body.isCompleted === undefined ? undefined : Boolean(body.isCompleted);
  const title = typeof body.title === "string" ? body.title.trim() : undefined;

  if (title !== undefined && !title) {
    return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      title,
      notes: body.notes === undefined ? undefined : typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
      dueDate: parseDueDateForUpdate(body.dueDate),
      isCompleted,
      completedAt: isCompleted === undefined ? undefined : isCompleted ? new Date() : null,
    },
  });

  return NextResponse.json(task);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
