export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export function titleFromPrompt(prompt: string): string {
  const compact = prompt.replace(/\s+/g, " ").trim();
  return compact.length > 60 ? `${compact.slice(0, 57)}…` : compact;
}
