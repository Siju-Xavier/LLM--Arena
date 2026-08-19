export interface ThreadSummary {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
}

export interface PersistedAnswer {
  readonly id: string;
  readonly modelId: string;
  readonly content: string;
  readonly status: "PENDING" | "STREAMING" | "COMPLETED" | "FAILED";
  readonly timeToFirstTokenMs: number | null;
  readonly tokensPerSecond: number | null;
  readonly totalTokens: number | null;
}

export interface PersistedTurn {
  readonly id: string;
  readonly prompt: string;
  readonly createdAt: string;
  readonly answers: readonly PersistedAnswer[];
  readonly winnerId: string | null;
}

export interface PersistedThread {
  readonly id: string;
  readonly title: string;
  readonly turns: readonly PersistedTurn[];
}

export interface ModelRecord {
  readonly modelId: string;
  readonly wins: number;
  readonly appearances: number;
}

export function recordsForThread(thread: PersistedThread | null): readonly ModelRecord[] {
  if (!thread) return [];

  const records = new Map<string, ModelRecord>();
  thread.turns.forEach((turn) => {
    turn.answers.forEach((answer) => {
      const current = records.get(answer.modelId) ?? {
        modelId: answer.modelId,
        wins: 0,
        appearances: 0,
      };
      records.set(answer.modelId, {
        ...current,
        appearances: current.appearances + 1,
        wins: current.wins + (turn.winnerId === answer.id ? 1 : 0),
      });
    });
  });
  return [...records.values()];
}
