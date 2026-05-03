import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const body = await request.json();
  const category = await prisma.category.create({
    data: {
      name: body.name,
      color: body.color ?? "#2563eb",
    },
  });

  return NextResponse.json(category, { status: 201 });
}
