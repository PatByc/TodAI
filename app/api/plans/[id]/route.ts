import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const plannedBlock = await prisma.plannedBlock.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!plannedBlock) {
    return NextResponse.json({ error: "Planned block not found" }, { status: 404 });
  }

  return NextResponse.json(plannedBlock);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const plannedBlock = await prisma.plannedBlock.update({
    where: { id },
    data: {
      title: body.title,
      notes: body.notes,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      categoryId: body.categoryId === undefined ? undefined : body.categoryId || null,
    },
    include: { category: true },
  });

  return NextResponse.json(plannedBlock);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await prisma.plannedBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
