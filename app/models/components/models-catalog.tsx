"use client";

import Link from "next/link";

import { useModelCatalog } from "@/app/arena/components/use-model-catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatContextWindow(contextLength: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    contextLength
  );
}

export function ModelsCatalog() {
  const { models, status, refresh } = useModelCatalog();

  return (
    <main className="models-page">
      <header className="models-header">
        <div>
          <p className="eyebrow">LLM Arena</p>
          <h1>Free model catalog</h1>
          <p>Every model available here has zero input and output pricing through OpenRouter.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Back to arena</Link>
        </Button>
      </header>

      {status === "loading" ? <p className="catalog-state">Loading free models…</p> : null}
      {status === "error" ? (
        <div className="catalog-state" role="status">
          <p>The model list is unavailable right now.</p>
          <Button type="button" variant="outline" size="sm" onClick={refresh}>
            Retry
          </Button>
        </div>
      ) : null}
      {status === "ready" ? (
        <section className="models-grid" aria-label="Free OpenRouter models">
          {models.map((model) => (
            <Card className="model-catalog-card" key={model.id}>
              <CardHeader>
                <CardTitle>{model.name}</CardTitle>
                <p className="model-id">{model.id}</p>
              </CardHeader>
              <CardContent className="model-catalog-details">
                <div>
                  <span>Context window</span>
                  <strong>{formatContextWindow(model.contextLength)} tokens</strong>
                </div>
                <div>
                  <span>Pricing</span>
                  <strong>$0 input · $0 output</strong>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}
    </main>
  );
}
