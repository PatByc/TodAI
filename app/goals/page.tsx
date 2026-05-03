import { prisma } from "@/lib/prisma";
import { Panel, Section } from "@/components/section";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = await prisma.goal.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <Section title="Goals">
      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((goal) => (
          <Panel key={goal.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{goal.title}</h2>
                <p className="text-sm text-gray-500">{goal.description}</p>
              </div>
              <span className="text-xs uppercase text-gray-500">{goal.period.toLowerCase()}</span>
            </div>
            <p className="mt-3 text-sm">Target: {goal.targetMinutes} min</p>
          </Panel>
        ))}
      </div>
    </Section>
  );
}
