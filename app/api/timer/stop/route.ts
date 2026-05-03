import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDurationMinutes } from "@/lib/dates";

// Stop the current timer and convert it into a permanent Entry row.
// This route is used by both categorized timers and sidebar timers that get categorized during the stop popup.
export async function POST(request: Request) {
  const activeTimer = await prisma.activeTimer.findFirst();

  if (!activeTimer) {
    return NextResponse.json({ error: "No active timer found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  // endTime is overridable for tests/future editing, but normal stop uses the current timestamp.
  const endTime = body.endTime ? new Date(body.endTime) : new Date();
  // If categoryId is omitted, preserve the timer's original category.
  // If categoryId is explicitly empty, save the entry as uncategorized.
  const categoryId = body.categoryId === undefined ? activeTimer.categoryId : body.categoryId || null;

  // Create Entry and delete ActiveTimer atomically so the UI never sees both for the same time block.
  const entry = await prisma.$transaction(async (tx) => {
    const createdEntry = await tx.entry.create({
      data: {
        // Stop popup can rename the entry to the selected category; otherwise keep the timer title.
        title: body.title ?? activeTimer.title,
        // Notes can be added at stop time. If not provided, keep any notes stored on the active timer.
        notes: body.notes ?? activeTimer.notes,
        startTime: activeTimer.startedAt,
        endTime,
        durationMinutes: getDurationMinutes(activeTimer.startedAt, endTime),
        categoryId,
      },
      include: { category: true },
    });

    await tx.activeTimer.delete({ where: { id: activeTimer.id } });
    return createdEntry;
  });

  return NextResponse.json(entry, { status: 201 });
}
