import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Start the single global timer.
// The app intentionally supports one active timer at a time because one user can only track one current activity.
export async function POST(request: Request) {
  const existing = await prisma.activeTimer.findFirst();

  // Return 409 instead of silently replacing the timer; the caller should stop the current one first.
  if (existing) {
    return NextResponse.json({ error: "A timer is already active" }, { status: 409 });
  }

  const body = await request.json();
  const activeTimer = await prisma.activeTimer.create({
    data: {
      // Fixed id is a lightweight guard for the local single-user app. findFirst() is still used for readability.
      id: 1,
      title: body.title,
      notes: body.notes,
      // startedAt can be supplied for tests or future manual resume/import flows; otherwise use now.
      startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
      categoryId: body.categoryId,
    },
    include: { category: true },
  });

  return NextResponse.json(activeTimer, { status: 201 });
}
