import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function main() {
  await prisma.activeTimer.deleteMany();
  await prisma.entry.deleteMany();
  await prisma.plannedBlock.deleteMany();
  await prisma.task.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.routine.deleteMany();
  await prisma.category.deleteMany();

  const deepWork = await prisma.category.create({
    data: { name: "Deep Work", color: "#2563eb" },
  });
  const admin = await prisma.category.create({
    data: { name: "Admin", color: "#16a34a" },
  });
  const health = await prisma.category.create({
    data: { name: "Health", color: "#dc2626" },
  });

  await prisma.entry.createMany({
    data: [
      {
        title: "Plan TodAI data model",
        notes: "Sketch models and core routes.",
        startTime: minutesAgo(60 * 3),
        endTime: minutesAgo(60 * 2 + 15),
        durationMinutes: 45,
        categoryId: deepWork.id,
      },
      {
        title: "Inbox cleanup",
        notes: "Clear pending admin items.",
        startTime: minutesAgo(60 * 26),
        endTime: minutesAgo(60 * 25 + 30),
        durationMinutes: 30,
        categoryId: admin.id,
      },
      {
        title: "Morning walk",
        startTime: minutesAgo(60 * 50),
        endTime: minutesAgo(60 * 49 + 20),
        durationMinutes: 40,
        categoryId: health.id,
      },
    ],
  });

  const today = new Date();
  const plannedDeepWorkStart = new Date(today);
  plannedDeepWorkStart.setHours(13, 0, 0, 0);
  const plannedDeepWorkEnd = new Date(today);
  plannedDeepWorkEnd.setHours(14, 30, 0, 0);
  const plannedAdminStart = new Date(today);
  plannedAdminStart.setHours(15, 0, 0, 0);
  const plannedAdminEnd = new Date(today);
  plannedAdminEnd.setHours(15, 30, 0, 0);

  await prisma.plannedBlock.createMany({
    data: [
      {
        title: "Product planning",
        notes: "Outline the next useful TodAI workflow.",
        startTime: plannedDeepWorkStart,
        endTime: plannedDeepWorkEnd,
        categoryId: deepWork.id,
      },
      {
        title: "Admin sweep",
        notes: "Handle small loose ends.",
        startTime: plannedAdminStart,
        endTime: plannedAdminEnd,
        categoryId: admin.id,
      },
    ],
  });

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  nextWeek.setHours(0, 0, 0, 0);

  await prisma.task.createMany({
    data: [
      {
        title: "Send weekly progress summary",
        notes: "One-time loose end that does not need a fixed time block.",
        dueDate: tomorrow,
      },
      {
        title: "Choose next automation experiment",
        notes: "Pick one idea worth testing before the next planning session.",
        dueDate: nextWeek,
      },
      {
        title: "Archive old notes",
        notes: "Clean up the backlog when there is spare admin energy.",
      },
    ],
  });

  await prisma.goal.createMany({
    data: [
      {
        title: "Deep work",
        description: "Spend focused time on important projects.",
        targetMinutes: 600,
        period: "WEEKLY",
      },
      {
        title: "Daily planning",
        description: "Protect ten minutes to plan the day.",
        targetMinutes: 70,
        period: "WEEKLY",
      },
    ],
  });

  await prisma.routine.createMany({
    data: [
      {
        title: "Morning startup",
        description: "Review goals, pick priorities, start first timer.",
        timeOfDay: "08:30",
        days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      },
      {
        title: "Evening review",
        description: "Close timers and review entries.",
        timeOfDay: "17:30",
        days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
