import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const goal = await prisma.goal.findUnique({ where: { id } });

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  return NextResponse.json(goal);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const goal = await prisma.goal.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      targetMinutes: body.targetMinutes === undefined ? undefined : Number(body.targetMinutes),
      period: body.period,
      isActive: body.isActive,
    },
  });

  return NextResponse.json(goal);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
