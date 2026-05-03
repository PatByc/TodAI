import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDurationMinutes } from "@/lib/dates";

export async function GET() {
  const entries = await prisma.entry.findMany({
    include: { category: true },
    orderBy: { startTime: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const body = await request.json();
  const startTime = new Date(body.startTime);
  const endTime = body.endTime ? new Date(body.endTime) : null;

  const entry = await prisma.entry.create({
    data: {
      title: body.title,
      notes: body.notes,
      startTime,
      endTime,
      durationMinutes: body.durationMinutes ?? (endTime ? getDurationMinutes(startTime, endTime) : 0),
      categoryId: body.categoryId,
    },
    include: { category: true },
  });

  return NextResponse.json(entry, { status: 201 });
}
