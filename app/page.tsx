import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/app/theme/toggle";

export default function Home() {
  return (
    <main className="look-proof">
      <header className="look-proof-header">
        <div>
          <h1 className="look-proof-brand">LLM Arena</h1>
          <p className="look-proof-lede">Send one prompt. Read three answers. Vote.</p>
        </div>
        <ThemeToggle />
      </header>

      <div className="look-proof-main">
        <div className="prompt-well">
          <Input
            defaultValue="Compare how these models explain a mutex."
            aria-label="Prompt"
            readOnly
          />
          <Button type="button">Send</Button>
        </div>

        <div className="model-grid">
          <Card>
            <CardHeader>
              <CardTitle>llama-3.3-70b</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="answer-body">
                A mutex is a lock that only one thread can hold at a time, so two writers cannot
                change the same memory together.
              </p>
            </CardContent>
            <CardFooter className="answer-meta">
              <div className="metric-row">
                <span className="metric">
                  <span className="metric-label">TTFT</span>142ms
                </span>
                <span className="metric">
                  <span className="metric-label">Speed</span>38 tok/s
                </span>
                <span className="metric">
                  <span className="metric-label">Tokens</span>412
                </span>
              </div>
              <Button type="button">Vote</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>gemini-2.0-flash</CardTitle>
              <span className="winner-mark">Winner</span>
            </CardHeader>
            <CardContent>
              <p className="answer-body">
                Think of a restroom key at a café: one person takes it, everyone else waits, then
                the key comes back. That is mutual exclusion.
              </p>
            </CardContent>
            <CardFooter className="answer-meta">
              <div className="metric-row">
                <span className="metric">
                  <span className="metric-label">TTFT</span>89ms
                </span>
                <span className="metric">
                  <span className="metric-label">Speed</span>52 tok/s
                </span>
                <span className="metric">
                  <span className="metric-label">Tokens</span>388
                </span>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>deepseek-r1</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="error-text">This model didn&apos;t answer.</p>
            </CardContent>
            <CardFooter>
              <Button type="button" variant="outline">
                Try again
              </Button>
            </CardFooter>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>llama-3.3-70b</CardTitle>
          </CardHeader>
          <CardContent className="stack">
            <div className="win-rate">
              <span className="win-rate-value">won 4 of 5</span>
              <div
                className="win-rate-track"
                role="meter"
                aria-label="won 4 of 5"
                aria-valuemin={0}
                aria-valuemax={5}
                aria-valuenow={4}
              >
                <div className="win-rate-fill" style={{ width: "80%" }} />
              </div>
            </div>
            <div className="metric-row">
              <span className="metric">
                <span className="metric-label">Avg speed</span>41 tok/s
              </span>
              <span className="metric">
                <span className="metric-label">Avg TTFT</span>118ms
              </span>
            </div>
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
