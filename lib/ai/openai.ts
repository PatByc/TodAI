import OpenAI from "openai";

type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | null;

/*
  temporary AI call - this code creates a fresh one-off model response per request.
  It is not creating a persistent OpenAI “Assistant” object in the Playground.
*/

const systemPrompt = `
  You are TodAI, a practical personal time assistant.

  Answer naturally, like a concise coach.
  Do not sound like a report generator.
  Use the user's actual data, but avoid dumping raw numbers unless they matter.
  Prioritize:
  1. the main insight
  2. why it matters
  3. one practical next step

  Keep answers short.
  Use simple language.
  You cannot change any data in the database, its read-only.
  Do not include metadata such as response time in the message.
  Do not include model names, request timing, or implementation details in the message.
  Do not say "based on your tracked time" every time.
  Do not invent data.
  If data is missing, say what is missing.
  Keep the response to 2-5 short sentences unless the user asks for more.
`;

export type TimeContext = Awaited<ReturnType<typeof import("./context").getUserTimeContext>>;

export type AssistantResponse = {
  reply: string;
  durationMs: number;
  model: string;
  usedMock: boolean;
};

export function buildAssistantPrompt(context: TimeContext, userMessage: string) {
  return `User question:
${userMessage}

TodAI local productivity context:
${JSON.stringify(context, null, 2)}

Answer in plain text. Use concrete numbers from the context when useful.`;
}

export function getMockAssistantResponse(context: TimeContext, userMessage: string) {
  const topCategory = Object.entries(context.week.byCategory).sort(([, a], [, b]) => b.minutes - a.minutes)[0];
  const goal = context.goals[0];

  const parts = [
    `You asked: "${userMessage}"`,
    `Today: ${context.today.totalMinutes} minutes. This week: ${context.week.totalMinutes} minutes.`,
  ];

  if (topCategory) {
    parts.push(`Your largest category this week is ${topCategory[0]} at ${topCategory[1].minutes} minutes.`);
  }

  if (goal) {
    parts.push(`${goal.title} is at ${goal.progressMinutes}/${goal.targetMinutes} minutes (${goal.percentComplete}%).`);
  } else {
    parts.push("No active goals are available yet, so goal-based advice is limited.");
  }

  parts.push("Practical next step: compare tomorrow's first time block with your top active goal, then start that category before opening other tasks.");

  return parts.join("\n\n");
}

function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5";
}

function getOpenAITimeoutMs() {
  const configuredTimeout = Number(process.env.OPENAI_TIMEOUT_MS);

  if (Number.isFinite(configuredTimeout) && configuredTimeout >= 5000) {
    return configuredTimeout;
  }

  return 30000;
}

function getOpenAIMaxOutputTokens() {
  const configuredMaxOutput = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS);

  if (Number.isFinite(configuredMaxOutput) && configuredMaxOutput >= 1000) {
    return configuredMaxOutput;
  }

  return 2000;
}

function getOpenAIReasoningEffort(): ReasoningEffort {
  const effort = process.env.OPENAI_REASONING_EFFORT?.trim();
  const allowedEfforts = new Set(["none", "minimal", "low", "medium", "high", "xhigh"]);

  if (effort && allowedEfforts.has(effort)) {
    return effort as ReasoningEffort;
  }

  return "minimal";
}

function extractResponseText(response: OpenAI.Responses.Response) {
  if (response.output_text?.trim()) {
    return response.output_text.trim();
  }

  const textParts: string[] = [];

  response.output.forEach((item) => {
    if (item.type !== "message") {
      return;
    }

    item.content.forEach((content) => {
      if (content.type === "output_text" && content.text.trim()) {
        textParts.push(content.text.trim());
      }
    });
  });

  return textParts.join("\n\n").trim();
}

function summarizeResponseForLogs(response: OpenAI.Responses.Response) {
  return {
    id: response.id,
    status: response.status,
    model: response.model,
    outputTypes: response.output.map((item) => item.type),
    incompleteDetails: response.incomplete_details ?? null,
    usage: response.usage
      ? {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : null,
    };
}

async function createResponse(
  client: OpenAI,
  context: TimeContext,
  userMessage: string,
  model: string,
  maxOutputTokens: number,
) {
  return client.responses.create({
    model,
    instructions: systemPrompt,
    input: buildAssistantPrompt(context, userMessage),
    max_output_tokens: maxOutputTokens,
    reasoning: {
      effort: getOpenAIReasoningEffort(),
    },
    text: {
      verbosity: "low",
    },
  });
}

export async function getAssistantResponse(context: TimeContext, userMessage: string): Promise<AssistantResponse> {
  const startedAt = Date.now();
  const model = getOpenAIModel();

  if (!process.env.OPENAI_API_KEY) {
    const reply = getMockAssistantResponse(context, userMessage);

    console.info("[TodAI AI] OPENAI_API_KEY missing; returned mock response", {
      durationMs: Date.now() - startedAt,
    });

    return {
      reply,
      durationMs: Date.now() - startedAt,
      model: "mock",
      usedMock: true,
    };
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: getOpenAITimeoutMs(),
  });

  console.info("[TodAI AI] OpenAI request started", {
    model,
    timeoutMs: getOpenAITimeoutMs(),
    maxOutputTokens: getOpenAIMaxOutputTokens(),
    reasoningEffort: getOpenAIReasoningEffort(),
  });

  let response = await createResponse(client, context, userMessage, model, getOpenAIMaxOutputTokens());
  const reply = extractResponseText(response);

  console.info("[TodAI AI] OpenAI response finished", {
    durationMs: Date.now() - startedAt,
    textLength: reply.length,
    ...summarizeResponseForLogs(response),
  });

  if (!reply && response.incomplete_details?.reason === "max_output_tokens") {
    const retryMaxOutputTokens = Math.max(getOpenAIMaxOutputTokens() * 2, 4000);

    console.warn("[TodAI AI] No visible text because max output was reached; retrying once", {
      retryMaxOutputTokens,
    });

    response = await createResponse(client, context, userMessage, model, retryMaxOutputTokens);
  }

  const finalReply = extractResponseText(response);
  const durationMs = Date.now() - startedAt;

  if (finalReply !== reply) {
    console.info("[TodAI AI] OpenAI retry response finished", {
      durationMs,
      textLength: finalReply.length,
      ...summarizeResponseForLogs(response),
    });
  }

  if (!finalReply) {
    console.warn("[TodAI AI] OpenAI returned no plain text output", summarizeResponseForLogs(response));

    return {
      reply:
        "I received an empty response from the AI provider. The request reached OpenAI, but no plain-text answer came back. Try again, or check the server logs for response status and token details.",
      durationMs,
      model,
      usedMock: false,
    };
  }

  return {
    reply: finalReply,
    durationMs,
    model,
    usedMock: false,
  };
}
