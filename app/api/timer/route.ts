import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const activeTimer = await prisma.activeTimer.findFirst({ include: { category: true } });
  return NextResponse.json(activeTimer);
}
