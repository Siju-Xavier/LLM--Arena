import { auth } from "@clerk/nextjs/server";

import { errorResponse } from "@/app/arena/lib/requests";
import { prisma } from "@/app/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return errorResponse("Sign in to see your threads.", 401);

  try {
    const threads = await prisma.thread.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, title: true, updatedAt: true },
    });
    return Response.json({
      threads: threads.map((thread) => ({ ...thread, updatedAt: thread.updatedAt.toISOString() })),
    });
  } catch (error) {
    console.error("[threads route] Could not load thread list:", error);
    return errorResponse("Your threads could not be loaded. Please try again.", 500);
  }
}
