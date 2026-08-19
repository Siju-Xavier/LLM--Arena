import arcjet, { detectBot, detectPromptInjection, shield, tokenBucket } from "@arcjet/next";
import { auth } from "@clerk/nextjs/server";
import { type NextRequest } from "next/server";

import { captureServerEvent } from "@/app/arena/lib/analytics";
import { getFreeModels } from "@/app/arena/lib/models";
import { errorResponse, isRecord, titleFromPrompt } from "@/app/arena/lib/requests";
import { prisma } from "@/app/db";
import { ARCJET_KEY } from "@/app/env";

const MAX_PROMPT_LENGTH = 12_000;

const turnProtection = arcjet({
  key: ARCJET_KEY,
  characteristics: ["userId"],
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({ mode: "LIVE", allow: [] }),
    tokenBucket({ mode: "LIVE", refillRate: 30, interval: "1h", capacity: 30 }),
    detectPromptInjection({ mode: "LIVE" }),
  ],
});

interface TurnRequest {
  readonly threadId: string | null;
  readonly prompt: string;
  readonly modelIds: readonly string[];
}

function parseTurnRequest(value: unknown): TurnRequest {
  if (!isRecord(value)) {
    throw new Error("INVALID");
  }

  const threadId = value.threadId;
  const prompt = value.prompt;
  const modelIds = value.modelIds;
  const uniqueModelIds = Array.isArray(modelIds)
    ? modelIds.filter((modelId): modelId is string => typeof modelId === "string")
    : [];
  const modelIdCount = Array.isArray(modelIds) ? modelIds.length : -1;

  if (
    !(threadId === null || threadId === undefined || typeof threadId === "string") ||
    typeof prompt !== "string" ||
    prompt.trim().length === 0 ||
    prompt.length > MAX_PROMPT_LENGTH ||
    uniqueModelIds.length !== modelIdCount ||
    uniqueModelIds.length < 1 ||
    uniqueModelIds.length > 3 ||
    new Set(uniqueModelIds).size !== uniqueModelIds.length
  ) {
    throw new Error("INVALID");
  }

  return {
    threadId: typeof threadId === "string" ? threadId : null,
    prompt: prompt.trim(),
    modelIds: uniqueModelIds,
  };
}

function deniedResponse(decision: Awaited<ReturnType<typeof turnProtection.protect>>): Response {
  if (decision.reason.isRateLimit()) {
    return errorResponse("You have reached the arena usage limit. Please try again later.", 429);
  }
  if (decision.reason.isPromptInjection()) {
    return errorResponse("That prompt was blocked by the safety check. Please rephrase it.", 400);
  }
  return errorResponse("This request was blocked by the security policy.", 403);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to send a prompt.", 401);
  }

  let input: TurnRequest;
  try {
    input = parseTurnRequest(await request.json());
  } catch {
    return errorResponse("Enter a prompt and choose between one and three models.", 400);
  }

  const decision = await turnProtection.protect(request, {
    userId,
    requested: input.modelIds.length,
    detectPromptInjectionMessage: input.prompt,
  });
  if (decision.isDenied()) {
    return deniedResponse(decision);
  }

  try {
    const allowedModels = new Set((await getFreeModels()).map((model) => model.id));
    if (input.modelIds.some((modelId) => !allowedModels.has(modelId))) {
      return errorResponse("One of those models is no longer available on the free tier.", 400);
    }

    const existingThread = input.threadId
      ? await prisma.thread.findFirst({
          where: { id: input.threadId, userId },
          select: { id: true },
        })
      : null;
    if (input.threadId && !existingThread) {
      return errorResponse("That thread could not be found.", 404);
    }

    const result = await prisma.$transaction(async (transaction) => {
      await transaction.user.upsert({ where: { id: userId }, create: { id: userId }, update: {} });
      const thread = existingThread
        ? await transaction.thread.update({
            where: { id: existingThread.id },
            data: { updatedAt: new Date() },
            select: { id: true },
          })
        : await transaction.thread.create({
            data: { userId, title: titleFromPrompt(input.prompt) },
            select: { id: true },
          });
      const turn = await transaction.turn.create({
        data: {
          threadId: thread.id,
          prompt: input.prompt,
          answers: { create: input.modelIds.map((modelId) => ({ modelId })) },
        },
        select: {
          id: true,
          answers: { select: { id: true, modelId: true }, orderBy: { createdAt: "asc" } },
        },
      });
      return { threadId: thread.id, turnId: turn.id, answers: turn.answers };
    });

    captureServerEvent({
      distinctId: userId,
      event: "prompt_sent",
      properties: {
        thread_id: result.threadId,
        turn_id: result.turnId,
        model_count: result.answers.length,
      },
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error("[turns route] Could not create turn:", error);
    return errorResponse("The prompt could not be started. Please try again.", 500);
  }
}
