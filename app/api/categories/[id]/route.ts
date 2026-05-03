import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const category = await prisma.category.findUnique({ where: { id } });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json(category);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const category = await prisma.category.update({
    where: { id },
    data: {
      name: body.name,
      color: body.color,
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
