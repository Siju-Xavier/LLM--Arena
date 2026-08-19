import type { ChatMessage } from "@/app/arena/lib/openrouter";

interface HistoricalTurn {
  readonly id: string;
  readonly prompt: string;
  readonly answers: readonly { readonly content: string }[];
}

export function buildModelConversation(
  turns: readonly HistoricalTurn[],
  currentTurnId: string
): readonly ChatMessage[] {
  const messages: ChatMessage[] = [];

  for (const turn of turns) {
    if (turn.id === currentTurnId) {
      messages.push({ role: "user", content: turn.prompt });
      break;
    }

    const answer = turn.answers[0];
    if (!answer) continue;

    messages.push(
      { role: "user", content: turn.prompt },
      { role: "assistant", content: answer.content }
    );
  }

  return messages;
}
