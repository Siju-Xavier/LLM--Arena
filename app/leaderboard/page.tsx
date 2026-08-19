import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Trophy } from "lucide-react";

import { getLeaderboard, type LeaderboardRow } from "@/app/leaderboard/data";
import { ThemeToggle } from "@/app/theme/toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Leaderboard · LLM Arena",
  description: "See which free AI models win real head-to-head comparisons.",
};

function formatSpeed(value: number | null): string {
  return value === null ? "Not available" : `${value.toFixed(1)} tokens/sec`;
}

function formatTime(value: number | null): string {
  return value === null ? "Not available" : `${(value / 1000).toFixed(2)} sec`;
}

function LeaderboardRows({ rows }: { readonly rows: readonly LeaderboardRow[] }) {
  return (
    <ol className="leaderboard-list" aria-label="Model rankings">
      {rows.map((row, index) => {
        const winRate = Math.round(row.winRate * 100);
        return (
          <li key={row.modelId}>
            <Card className={`leaderboard-row ${index === 0 ? "is-first" : ""}`}>
              <div className="leaderboard-rank" aria-label={`Rank ${index + 1}`}>
                {index === 0 ? <Trophy aria-hidden /> : index + 1}
              </div>
              <div className="leaderboard-model">
                <h2>{row.modelName}</h2>
                <p>{row.modelId}</p>
              </div>
              <div className="leaderboard-result">
                <div className="leaderboard-rate-line">
                  <strong>{winRate}%</strong>
                  <span className="leaderboard-bar" aria-hidden>
                    <span style={{ width: `${winRate}%` }} />
                  </span>
                </div>
                <p>
                  won {row.wins} of {row.appearances}
                </p>
              </div>
              <dl className="leaderboard-metrics">
                <div>
                  <dt>Average speed</dt>
                  <dd>{formatSpeed(row.averageTokensPerSecond)}</dd>
                </div>
                <div>
                  <dt>Average TTFT</dt>
                  <dd>{formatTime(row.averageTimeToFirstTokenMs)}</dd>
                </div>
              </dl>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [{ userId }, query] = await Promise.all([auth(), searchParams]);
  const isPersonal = query.view === "personal";
  const rows = !isPersonal || userId ? await getLeaderboard(isPersonal ? userId! : undefined) : [];

  return (
    <main className="leaderboard-page">
      <header className="leaderboard-header">
        <div className="leaderboard-header-actions">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft aria-hidden /> Arena
            </Link>
          </Button>
          <ThemeToggle />
        </div>
        <p className="eyebrow">The café scoreboard</p>
        <h1>Leaderboard</h1>
        <p>Real votes from head-to-head answers—not benchmarks or made-up scores.</p>
      </header>

      <nav className="leaderboard-tabs" aria-label="Leaderboard view">
        <Button asChild variant={!isPersonal ? "default" : "ghost"} size="sm">
          <Link href="/leaderboard" aria-current={!isPersonal ? "page" : undefined}>
            Global
          </Link>
        </Button>
        <Button asChild variant={isPersonal ? "default" : "ghost"} size="sm">
          <Link href="/leaderboard?view=personal" aria-current={isPersonal ? "page" : undefined}>
            Personal
          </Link>
        </Button>
      </nav>

      {isPersonal && !userId ? (
        <section className="leaderboard-empty">
          <Trophy aria-hidden />
          <h2>Your scoreboard starts when you vote</h2>
          <p>Sign in to see which models win your own comparisons.</p>
          <SignInButton mode="modal">
            <Button type="button">Sign in</Button>
          </SignInButton>
        </section>
      ) : rows.length > 0 ? (
        <LeaderboardRows rows={rows} />
      ) : (
        <section className="leaderboard-empty">
          <Trophy aria-hidden />
          <h2>{isPersonal ? "No personal results yet" : "No results yet"}</h2>
          <p>
            {isPersonal
              ? "Vote on a comparison and your model record will appear here."
              : "The first completed comparison with a vote will start the rankings."}
          </p>
          <Button asChild>
            <Link href="/">Start a comparison</Link>
          </Button>
        </section>
      )}
    </main>
  );
}
