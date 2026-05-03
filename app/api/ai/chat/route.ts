import { NextResponse } from "next/server";
import { getUserTimeContext } from "@/lib/ai/context";
import { getAssistantResponse } from "@/lib/ai/openai";

const localTestUserId = "local-test-user";

function formatDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(durationMs >= 10000 ? 1 : 2)}s`;
}

export async function POST(request: Request) {
  const routeStartedAt = Date.now();
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    console.info("[TodAI AI] Chat request received", {
      messageLength: message.length,
    });

    const context = await getUserTimeContext(localTestUserId);
    console.info("[TodAI AI] Context aggregated", {
      todayMinutes: context.today.totalMinutes,
      weekMinutes: context.week.totalMinutes,
      monthMinutes: context.month.totalMinutes,
      goalCount: context.goals.length,
      recentEntryCount: context.recentEntries.length,
      hasActiveTimer: Boolean(context.activeTimer),
    });

    const assistantResponse = await getAssistantResponse(context, message);
    const totalDurationMs = Date.now() - routeStartedAt;

    console.info("[TodAI AI] Chat request completed", {
      totalDurationMs,
      aiDurationMs: assistantResponse.durationMs,
      model: assistantResponse.model,
      usedMock: assistantResponse.usedMock,
      replyLength: assistantResponse.reply.length,
    });

    return NextResponse.json({
      reply: assistantResponse.reply,
      durationMs: totalDurationMs,
      durationLabel: formatDuration(totalDurationMs),
      aiDurationMs: assistantResponse.durationMs,
      model: assistantResponse.model,
      usedMock: assistantResponse.usedMock,
    });
  } catch (error) {
    const totalDurationMs = Date.now() - routeStartedAt;
    console.error("[TodAI AI] Chat request failed", {
      totalDurationMs,
      error,
    });

    const isTimeout =
      error instanceof Error &&
      (error.name.toLowerCase().includes("timeout") ||
        error.message.toLowerCase().includes("timeout") ||
        error.message.toLowerCase().includes("timed out"));

    return NextResponse.json(
      {
        error: isTimeout
          ? `AI assistant timed out after ${formatDuration(totalDurationMs)}. Try again or increase OPENAI_TIMEOUT_MS.`
          : "AI assistant failed to respond",
        durationMs: totalDurationMs,
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
