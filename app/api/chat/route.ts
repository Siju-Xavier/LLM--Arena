// Route handler for chat completions.
// POST /api/chat — accepts { modelId, messages }, streams the response back.
// Each model call is its own independent connection; the client opens one of
// these per selected model, so one failing never takes down the others.

import { type NextRequest } from "next/server";
import arcjet, { shield, detectBot } from "@arcjet/next";
import { streamChatCompletion, type ChatMessage } from "@/app/arena/lib/openrouter";

// ---------------------------------------------------------------------------
// Arcjet — placeholder rules, real rate-limiting comes in Feature 6.
// ---------------------------------------------------------------------------
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [shield({ mode: "LIVE" }), detectBot({ mode: "LIVE", allow: [] })],
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
interface ChatRequestBody {
  readonly modelId: string;
  readonly messages: readonly ChatMessage[];
}

function parseBody(raw: unknown): ChatRequestBody {
  if (typeof raw !== "object" || raw === null || !("modelId" in raw) || !("messages" in raw)) {
    throw new Error("Request body must include modelId and messages.");
  }

  const { modelId, messages } = raw as Record<string, unknown>;

  if (typeof modelId !== "string" || modelId.length === 0) {
    throw new Error("modelId must be a non-empty string.");
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("messages must be a non-empty array.");
  }

  for (const msg of messages) {
    if (
      typeof msg !== "object" ||
      msg === null ||
      typeof (msg as Record<string, unknown>).role !== "string" ||
      typeof (msg as Record<string, unknown>).content !== "string"
    ) {
      throw new Error("Each message must have a string role and string content.");
    }
  }

  return { modelId: modelId as string, messages: messages as ChatMessage[] };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  // 1. Arcjet protection
  const decision = await aj.protect(request);
  if (decision.isDenied()) {
    return Response.json(
      { error: "Request blocked by security policy. Please try again later." },
      { status: 403 }
    );
  }

  // 2. Parse + validate body
  let body: ChatRequestBody;
  try {
    const raw: unknown = await request.json();
    body = parseBody(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body.";
    return Response.json({ error: message }, { status: 400 });
  }

  // 3. Stream from OpenRouter
  try {
    const stream = await streamChatCompletion(body.modelId, body.messages);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    // Never show a raw exception to the user (CLAUDE.md rule).
    console.error("[chat route] OpenRouter error:", err);
    return Response.json(
      {
        error: "Something went wrong reaching the model. Please try again in a moment.",
      },
      { status: 502 }
    );
  }
}
