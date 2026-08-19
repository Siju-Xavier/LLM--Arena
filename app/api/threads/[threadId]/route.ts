import { auth } from "@clerk/nextjs/server";

import { errorResponse } from "@/app/arena/lib/requests";
import { getPublicThread } from "@/app/arena/lib/thread-data";

interface RouteContext {
  readonly params: Promise<{ readonly threadId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { userId } = await auth();
  const { threadId } = await context.params;

  try {
    const result = await getPublicThread(threadId);
    if (!result) return errorResponse("That thread could not be found.", 404);

    return Response.json({
      thread: result.thread,
      isOwner: userId === result.ownerId,
    });
  } catch (error) {
    console.error("[thread route] Could not load thread:", error);
    return errorResponse("This thread could not be loaded. Please try again.", 500);
  }
}
