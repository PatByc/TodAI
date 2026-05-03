import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const goals = await prisma.goal.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(goals);
}

export async function POST(request: Request) {
  const body = await request.json();
  const goal = await prisma.goal.create({
    data: {
      title: body.title,
      description: body.description,
      targetMinutes: Number(body.targetMinutes),
      period: body.period ?? "WEEKLY",
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
