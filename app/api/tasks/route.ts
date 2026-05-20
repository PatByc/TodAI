import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseDueDate(value: unknown) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  // Tasks are day-level commitments, so store the selected date at local midnight.
  return new Date(`${value}T00:00:00`);
}

export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title,
      notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
      dueDate: parseDueDate(body.dueDate),
      isCompleted: Boolean(body.isCompleted),
      completedAt: body.isCompleted ? new Date() : null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
