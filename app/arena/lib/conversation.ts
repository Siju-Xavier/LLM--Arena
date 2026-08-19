import type { ChatMessage } from "@/app/arena/lib/openrouter";

interface HistoricalTurn {
  readonly prompt: string;
  readonly answers: readonly { readonly content: string }[];
}

export function buildModelConversation(turns: readonly HistoricalTurn[]): readonly ChatMessage[] {
  return turns.flatMap((turn) => {
    const answer = turn.answers[0];
    return answer
      ? [
          { role: "user" as const, content: turn.prompt },
          { role: "assistant" as const, content: answer.content },
        ]
      : [{ role: "user" as const, content: turn.prompt }];
  });
}
