import { auth } from "@clerk/nextjs/server";

import { errorResponse } from "@/app/arena/lib/requests";
import { prisma } from "@/app/db";

interface RouteContext {
  readonly params: Promise<{ readonly threadId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Sign in to open this thread.", 401);
  const { threadId } = await context.params;

  try {
    const thread = await prisma.thread.findFirst({
      where: { id: threadId, userId },
      select: {
        id: true,
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
    if (!thread) return errorResponse("That thread could not be found.", 404);

    return Response.json({
      thread: {
        ...thread,
        turns: thread.turns.map(({ vote, ...turn }) => ({
          ...turn,
          createdAt: turn.createdAt.toISOString(),
          winnerId: vote?.answerId ?? null,
        })),
      },
    });
  } catch (error) {
    console.error("[thread route] Could not load thread:", error);
    return errorResponse("This thread could not be loaded. Please try again.", 500);
  }
}
