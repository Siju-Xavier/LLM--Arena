// OpenRouter streaming client.
// Pure function: takes a model ID and a message list, returns a ReadableStream
// of SSE chunks. Knows nothing about the HTTP request/response cycle.

import { OPENROUTER_API_KEY } from "@/app/env";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** A single chat message in the OpenAI-compatible format. */
export interface ChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

/** The shape of each SSE chunk OpenRouter sends back. */
export interface StreamChunk {
  readonly id: string;
  readonly choices: ReadonlyArray<{
    readonly delta: { readonly content?: string; readonly role?: string };
    readonly finish_reason: string | null;
    readonly index: number;
  }>;
  readonly model: string;
  readonly usage?: {
    readonly prompt_tokens: number;
    readonly completion_tokens: number;
    readonly total_tokens: number;
  };
}

/**
 * Call OpenRouter with streaming enabled and return the raw `ReadableStream`
 * from the fetch response. The caller is responsible for piping this to the
 * client or consuming it in whatever way makes sense.
 *
 * Throws on network failure or a non-2xx status from OpenRouter.
 */
export async function streamChatCompletion(
  modelId: string,
  messages: readonly ChatMessage[]
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://llm-arena.app",
      "X-Title": "LLM Arena",
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable body)");
    throw new Error(
      `OpenRouter returned ${response.status}: ${body}`
    );
  }

  if (!response.body) {
    throw new Error("OpenRouter returned no response body.");
  }

  return response.body;
}
