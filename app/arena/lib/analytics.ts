import { getServerPostHog } from "@/app/posthog/server";

interface AnalyticsEvent {
  readonly distinctId: string;
  readonly event: string;
  readonly properties?: Readonly<Record<string, unknown>>;
}

export function captureServerEvent({ distinctId, event, properties }: AnalyticsEvent): void {
  try {
    getServerPostHog().capture({ distinctId, event, properties });
  } catch (error) {
    console.error(`[analytics] Could not capture ${event}:`, error);
  }
}

interface GenerationEvent {
  readonly distinctId: string;
  readonly model: string;
  readonly traceId: string;
  readonly input: readonly { readonly role: string; readonly content: string }[];
  readonly output: string;
  readonly latencySeconds: number;
  readonly timeToFirstTokenSeconds: number | null;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly totalTokens: number | null;
  readonly error: string | null;
}

export function captureGeneration(event: GenerationEvent): void {
  captureServerEvent({
    distinctId: event.distinctId,
    event: "$ai_generation",
    properties: {
      $ai_trace_id: event.traceId,
      $ai_provider: "openrouter",
      $ai_model: event.model,
      $ai_input: event.input,
      $ai_output_choices: [{ role: "assistant", content: event.output }],
      $ai_latency: event.latencySeconds,
      $ai_stream: true,
      $ai_time_to_first_token: event.timeToFirstTokenSeconds,
      $ai_input_tokens: event.inputTokens,
      $ai_output_tokens: event.outputTokens,
      $ai_total_tokens: event.totalTokens,
      $ai_input_cost_usd: 0,
      $ai_output_cost_usd: 0,
      $ai_total_cost_usd: 0,
      $ai_is_error: event.error !== null,
      $ai_error: event.error,
    },
  });
}
