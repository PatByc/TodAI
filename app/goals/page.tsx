import { prisma } from "@/lib/prisma";
import { Panel, Section } from "@/components/section";
import { LocalizedText } from "@/components/LocalizedText";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = await prisma.goal.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <Section title={<LocalizedText en="Goals" pl="Cele" />}>
      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((goal) => (
          <Panel key={goal.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{goal.title}</h2>
                <p className="text-sm text-gray-500">{goal.description}</p>
              </div>
              <span className="text-xs uppercase text-gray-500">
                {goal.period === "DAILY" ? <LocalizedText en="daily" pl="dzienny" /> : null}
                {goal.period === "WEEKLY" ? <LocalizedText en="weekly" pl="tygodniowy" /> : null}
                {goal.period === "MONTHLY" ? <LocalizedText en="monthly" pl="miesięczny" /> : null}
              </span>
            </div>
            <p className="mt-3 text-sm">
              <LocalizedText en="Target" pl="Cel" />: {goal.targetMinutes} min
            </p>
          </Panel>
        ))}
      </div>
    </Section>
  );
}
