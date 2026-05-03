import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const plannedBlocks = await prisma.plannedBlock.findMany({
    include: { category: true },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(plannedBlocks);
}

export async function POST(request: Request) {
  const body = await request.json();
  const plannedBlock = await prisma.plannedBlock.create({
    data: {
      title: body.title,
      notes: body.notes,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      categoryId: body.categoryId || null,
    },
    include: { category: true },
  });

  return NextResponse.json(plannedBlock, { status: 201 });
}
