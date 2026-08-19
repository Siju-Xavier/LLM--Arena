import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/app/db";
import { getFreeModels } from "@/app/arena/lib/models";

interface AggregatedLeaderboardRow {
  readonly modelId: string;
  readonly wins: number;
  readonly appearances: number;
  readonly averageTokensPerSecond: number | null;
  readonly averageTimeToFirstTokenMs: number | null;
}

export interface LeaderboardRow extends AggregatedLeaderboardRow {
  readonly modelName: string;
  readonly winRate: number;
}

function fallbackModelName(modelId: string): string {
  return modelId.split("/").at(-1)?.replaceAll(/[-_]/g, " ") ?? modelId;
}

export async function getLeaderboard(userId?: string): Promise<readonly LeaderboardRow[]> {
  const voterFilter = userId ? Prisma.sql`AND v."userId" = ${userId}` : Prisma.empty;
  const rows = await prisma.$queryRaw<AggregatedLeaderboardRow[]>(Prisma.sql`
    SELECT
      a."modelId" AS "modelId",
      COUNT(*)::int AS "appearances",
      COUNT(*) FILTER (WHERE v."answerId" = a.id)::int AS "wins",
      AVG(a."tokensPerSecond")::float8 AS "averageTokensPerSecond",
      AVG(a."timeToFirstTokenMs")::float8 AS "averageTimeToFirstTokenMs"
    FROM "Answer" a
    INNER JOIN "Turn" t ON t.id = a."turnId"
    INNER JOIN "Vote" v ON v."turnId" = t.id
    WHERE a.status = 'COMPLETED'
      AND a."completedAt" IS NOT NULL
      AND a."completedAt" <= v."createdAt"
    ${voterFilter}
    GROUP BY a."modelId"
  `);

  let modelNames = new Map<string, string>();
  try {
    modelNames = new Map((await getFreeModels()).map((model) => [model.id, model.name]));
  } catch {
    // Historical results remain useful when OpenRouter's live catalog is unavailable.
  }

  return rows
    .map((row) => ({
      ...row,
      modelName: modelNames.get(row.modelId) ?? fallbackModelName(row.modelId),
      winRate: row.appearances === 0 ? 0 : row.wins / row.appearances,
    }))
    .sort(
      (first, second) =>
        second.winRate - first.winRate ||
        second.wins - first.wins ||
        second.appearances - first.appearances ||
        first.modelId.localeCompare(second.modelId)
    );
}
