import { prisma } from "@/lib/prisma";
import { TasksClient } from "@/components/tasks-client";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  // Keep the page server-loaded like Plans/Routines, then let the client component handle CRUD interactions.
  const tasks = await prisma.task.findMany({
    orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return (
    <TasksClient
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        notes: task.notes,
        dueDate: task.dueDate?.toISOString() ?? null,
        isCompleted: task.isCompleted,
        completedAt: task.completedAt?.toISOString() ?? null,
      }))}
    />
  );
}
