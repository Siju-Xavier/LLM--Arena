import "server-only";

import { prisma } from "@/app/db";
import type { PersistedThread } from "@/app/arena/lib/threads";

export interface PublicThreadResult {
  readonly thread: PersistedThread;
  readonly ownerId: string;
}

export async function getPublicThread(threadId: string): Promise<PublicThreadResult | null> {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      userId: true,
      title: true,
      turns: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          prompt: true,
          createdAt: true,
          answers: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              modelId: true,
              content: true,
              status: true,
              timeToFirstTokenMs: true,
              tokensPerSecond: true,
              totalTokens: true,
            },
          },
          vote: { select: { answerId: true } },
        },
      },
    },
  });

  if (!thread) return null;

  return {
    ownerId: thread.userId,
    thread: {
      id: thread.id,
      title: thread.title,
      turns: thread.turns.map(({ vote, ...turn }) => ({
        ...turn,
        createdAt: turn.createdAt.toISOString(),
        winnerId: vote?.answerId ?? null,
      })),
    },
  };
}
