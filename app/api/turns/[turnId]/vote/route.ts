import arcjet, { detectBot, shield } from "@arcjet/next";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { type NextRequest } from "next/server";

import { captureServerEvent } from "@/app/arena/lib/analytics";
import { errorResponse, isRecord } from "@/app/arena/lib/requests";
import { prisma } from "@/app/db";
import { ARCJET_KEY } from "@/app/env";

const voteProtection = arcjet({
  key: ARCJET_KEY,
  rules: [shield({ mode: "LIVE" }), detectBot({ mode: "LIVE", allow: [] })],
});

interface RouteContext {
  readonly params: Promise<{ readonly turnId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to vote.", 401);
  }

  const decision = await voteProtection.protect(request);
  if (decision.isDenied()) {
    return errorResponse("This request was blocked by the security policy.", 403);
  }

  const body: unknown = await request.json().catch(() => null);
  const answerId = isRecord(body) && typeof body.answerId === "string" ? body.answerId : null;
  if (!answerId) {
    return errorResponse("Choose a completed answer to vote.", 400);
  }

  const { turnId } = await context.params;
  try {
    const vote = await prisma.$transaction(async (transaction) => {
      const turn = await transaction.turn.findFirst({
        where: { id: turnId, thread: { userId } },
        select: {
          answers: { select: { id: true, status: true } },
          vote: { select: { id: true } },
        },
      });
      if (!turn) throw new Error("NOT_FOUND");
      if (turn.vote) throw new Error("ALREADY_VOTED");
      const completed = turn.answers.filter((answer) => answer.status === "COMPLETED");
      if (completed.length < 2 || !completed.some((answer) => answer.id === answerId)) {
        throw new Error("NOT_ELIGIBLE");
      }
      return transaction.vote.create({
        data: { turnId, answerId, userId },
        select: { id: true, answerId: true },
      });
    });

    captureServerEvent({
      distinctId: userId,
      event: "vote_cast",
      properties: { turn_id: turnId, answer_id: answerId },
    });
    return Response.json({ vote });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND")
      return errorResponse("That turn could not be found.", 404);
    if (
      (error instanceof Error && error.message === "ALREADY_VOTED") ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    )
      return errorResponse("A vote has already been recorded for this turn.", 409);
    if (error instanceof Error && error.message === "NOT_ELIGIBLE")
      return errorResponse("Voting opens after at least two answers finish.", 400);
    console.error("[vote route] Could not save vote:", error);
    return errorResponse("Your vote could not be saved. Please try again.", 500);
  }
}
