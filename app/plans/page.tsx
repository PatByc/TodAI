import { prisma } from "@/lib/prisma";
import { PlansClient } from "@/components/plans-client";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const [plannedBlocks, categories] = await Promise.all([
    prisma.plannedBlock.findMany({
      include: { category: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <PlansClient
      plannedBlocks={plannedBlocks.map((block) => ({
        id: block.id,
        title: block.title,
        notes: block.notes,
        startTime: block.startTime.toISOString(),
        endTime: block.endTime.toISOString(),
        category: block.category
          ? {
              id: block.category.id,
              name: block.category.name,
              color: block.category.color,
            }
          : null,
      }))}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
      }))}
    />
  );
}
