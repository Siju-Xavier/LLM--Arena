import arcjet, { detectBot, shield } from "@arcjet/next";
import { auth } from "@clerk/nextjs/server";
import { type NextRequest } from "next/server";

import { captureGeneration, captureServerEvent } from "@/app/arena/lib/analytics";
import { buildModelConversation } from "@/app/arena/lib/conversation";
import { streamChatCompletion, type StreamChunk } from "@/app/arena/lib/openrouter";
import { errorResponse, isRecord } from "@/app/arena/lib/requests";
import { prisma } from "@/app/db";
import { ARCJET_KEY } from "@/app/env";

const chatProtection = arcjet({
  key: ARCJET_KEY,
  rules: [shield({ mode: "LIVE" }), detectBot({ mode: "LIVE", allow: [] })],
});

interface Usage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

interface StreamState {
  readonly content: string;
  readonly firstTokenAt: number | null;
  readonly usage: Usage | null;
}

function parseAnswerId(value: unknown): string | null {
  return isRecord(value) && typeof value.answerId === "string" && value.answerId.length > 0
    ? value.answerId
    : null;
}

function toSse(event: string, data: Readonly<Record<string, unknown>>): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function parseProviderChunk(line: string): StreamChunk | null {
  if (!line.startsWith("data:")) return null;
  const data = line.slice(5).trim();
  if (!data || data === "[DONE]") return null;
  try {
    return JSON.parse(data) as StreamChunk;
  } catch {
    throw new Error("INVALID_PROVIDER_STREAM");
  }
}

function nextState(state: StreamState, chunk: StreamChunk, receivedAt: number): StreamState {
  const text = chunk.choices.map((choice) => choice.delta.content ?? "").join("");
  const usage = chunk.usage
    ? {
        promptTokens: chunk.usage.prompt_tokens,
        completionTokens: chunk.usage.completion_tokens,
        totalTokens: chunk.usage.total_tokens,
      }
    : state.usage;
  return {
    content: state.content + text,
    firstTokenAt: state.firstTokenAt ?? (text ? receivedAt : null),
    usage,
  };
}

async function markFailed(answerId: string, errorCode: string): Promise<void> {
  await prisma.answer.updateMany({
    where: { id: answerId, status: "STREAMING" },
    data: { status: "FAILED", isFailed: true, errorCode, completedAt: new Date() },
  });
}

function createAnswerStream({
  providerStream,
  answerId,
  turnId,
  userId,
  modelId,
  messages,
  requestStartedAt,
}: {
  readonly providerStream: ReadableStream<Uint8Array>;
  readonly answerId: string;
  readonly turnId: string;
  readonly userId: string;
  readonly modelId: string;
  readonly messages: ReturnType<typeof buildModelConversation>;
  readonly requestStartedAt: number;
}): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const run = async () => {
        const reader = providerStream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let state: StreamState = { content: "", firstTokenAt: null, usage: null };

        try {
          controller.enqueue(toSse("start", { answerId, modelId }));
          while (true) {
            const result = await reader.read();
            if (result.done) break;
            buffer += decoder.decode(result.value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.at(-1) ?? "";
            for (const line of lines.slice(0, -1)) {
              const chunk = parseProviderChunk(line.trim());
              if (!chunk) continue;
              const previousContent = state.content;
              state = nextState(state, chunk, Date.now());
              const token = state.content.slice(previousContent.length);
              if (token) controller.enqueue(toSse("token", { text: token }));
            }
          }

          if (!state.content || state.firstTokenAt === null) throw new Error("EMPTY_RESPONSE");
          const completedAt = Date.now();
          const ttftMs = state.firstTokenAt - requestStartedAt;
          const generationSeconds = Math.max((completedAt - state.firstTokenAt) / 1000, 0.001);
          const tokensPerSecond = state.usage
            ? state.usage.completionTokens / generationSeconds
            : null;
          await prisma.answer.update({
            where: { id: answerId },
            data: {
              content: state.content,
              status: "COMPLETED",
              isFailed: false,
              errorCode: null,
              timeToFirstTokenMs: Math.round(ttftMs),
              tokensPerSecond,
              totalTokens: state.usage?.totalTokens ?? null,
              completedAt: new Date(completedAt),
            },
          });
          const metrics = {
            timeToFirstTokenMs: Math.round(ttftMs),
            tokensPerSecond,
            totalTokens: state.usage?.totalTokens ?? null,
          };
          controller.enqueue(toSse("metrics", metrics));
          controller.enqueue(toSse("complete", { answerId }));
          captureServerEvent({
            distinctId: userId,
            event: "answer_finished",
            properties: { answer_id: answerId, turn_id: turnId, model_id: modelId, ...metrics },
          });
          captureGeneration({
            distinctId: userId,
            model: modelId,
            traceId: turnId,
            input: messages,
            output: state.content,
            latencySeconds: (completedAt - requestStartedAt) / 1000,
            timeToFirstTokenSeconds: ttftMs / 1000,
            inputTokens: state.usage?.promptTokens ?? null,
            outputTokens: state.usage?.completionTokens ?? null,
            totalTokens: state.usage?.totalTokens ?? null,
            error: null,
          });
          controller.close();
        } catch (error) {
          const errorCode = error instanceof Error ? error.message : "STREAM_FAILED";
          console.error(`[chat route] ${modelId} stream failed:`, error);
          await markFailed(answerId, errorCode).catch((databaseError) =>
            console.error("[chat route] Could not persist failed answer:", databaseError)
          );
          captureServerEvent({
            distinctId: userId,
            event: "answer_failed",
            properties: {
              answer_id: answerId,
              turn_id: turnId,
              model_id: modelId,
              error_code: errorCode,
            },
          });
          captureGeneration({
            distinctId: userId,
            model: modelId,
            traceId: turnId,
            input: messages,
            output: state.content,
            latencySeconds: (Date.now() - requestStartedAt) / 1000,
            timeToFirstTokenSeconds:
              state.firstTokenAt === null ? null : (state.firstTokenAt - requestStartedAt) / 1000,
            inputTokens: state.usage?.promptTokens ?? null,
            outputTokens: state.usage?.completionTokens ?? null,
            totalTokens: state.usage?.totalTokens ?? null,
            error: errorCode,
          });
          try {
            controller.enqueue(
              toSse("error", { message: "This model could not finish its answer." })
            );
            controller.close();
          } catch {
            // The browser disconnected; persistence and server analytics still completed.
          }
        } finally {
          reader.releaseLock();
        }
      };
      void run();
    },
  });
}

export async function POST(request: NextRequest) {
  const requestStartedAt = Date.now();
  const { userId } = await auth();
  if (!userId) return errorResponse("Sign in to request an answer.", 401);

  const decision = await chatProtection.protect(request);
  if (decision.isDenied())
    return errorResponse("This request was blocked by the security policy.", 403);

  const answerId = parseAnswerId(await request.json().catch(() => null));
  if (!answerId) return errorResponse("A valid answer is required.", 400);

  const answer = await prisma.answer.findFirst({
    where: { id: answerId, turn: { thread: { userId } } },
    select: {
      id: true,
      modelId: true,
      turnId: true,
      status: true,
      turn: { select: { threadId: true } },
    },
  });
  if (!answer) return errorResponse("That answer could not be found.", 404);
  if (answer.status !== "PENDING" && answer.status !== "FAILED")
    return errorResponse("That answer has already been started.", 409);

  const claimed = await prisma.answer.updateMany({
    where: { id: answerId, status: { in: ["PENDING", "FAILED"] } },
    data: {
      status: "STREAMING",
      content: "",
      isFailed: false,
      errorCode: null,
      timeToFirstTokenMs: null,
      tokensPerSecond: null,
      totalTokens: null,
      startedAt: new Date(),
      completedAt: null,
    },
  });
  if (claimed.count !== 1) return errorResponse("That answer has already been started.", 409);

  try {
    const turns = await prisma.turn.findMany({
      where: { threadId: answer.turn.threadId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        prompt: true,
        answers: {
          where: { modelId: answer.modelId, status: "COMPLETED" },
          select: { content: true },
          take: 1,
        },
      },
    });
    const messages = buildModelConversation(turns, answer.turnId);
    const providerStream = await streamChatCompletion(answer.modelId, messages);
    const stream = createAnswerStream({
      providerStream,
      answerId,
      turnId: answer.turnId,
      userId,
      modelId: answer.modelId,
      messages,
      requestStartedAt,
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error(`[chat route] Could not start ${answer.modelId}:`, error);
    await markFailed(answerId, "PROVIDER_UNAVAILABLE");
    captureServerEvent({
      distinctId: userId,
      event: "answer_failed",
      properties: {
        answer_id: answerId,
        turn_id: answer.turnId,
        model_id: answer.modelId,
        error_code: "PROVIDER_UNAVAILABLE",
      },
    });
    return errorResponse(
      "This model is unavailable right now. Try it again with a new prompt.",
      502
    );
  }
}
