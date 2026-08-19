"use client";

import {
  Bot,
  LayoutPanelTop,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { ModelPicker } from "@/app/arena/components/model-picker";
import { useModelCatalog } from "@/app/arena/components/use-model-catalog";
import { ThemeToggle } from "@/app/theme/toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const threads = [
  { title: "Mutexes, simply", time: "Just now", active: true },
  { title: "A good retry policy", time: "Yesterday", active: false },
  { title: "What makes prose clear?", time: "Aug 16", active: false },
  { title: "SQL query plan review", time: "Aug 14", active: false },
];

export function ArenaShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [metricsVisible, setMetricsVisible] = useState(true);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const initializedSelection = useRef(false);
  const { models: catalog, status: catalogStatus, refresh: refreshCatalog } = useModelCatalog();
  const models = useMemo(
    () => catalog.filter((model) => selectedIds.includes(model.id)),
    [catalog, selectedIds]
  );

  useEffect(() => {
    if (catalogStatus === "ready" && !initializedSelection.current) {
      initializedSelection.current = true;
      setSelectedIds(catalog.slice(0, 3).map((model) => model.id));
    }
  }, [catalog, catalogStatus]);

  const addModel = (modelId: string) => {
    setSelectedIds((current) =>
      current.length < 3 && !current.includes(modelId) ? [...current, modelId] : current
    );
  };

  const removeModel = (modelId: string) => {
    setSelectedIds((current) => current.filter((id) => id !== modelId));
  };

  return (
    <main
      className={`arena-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${
        mobileSidebarOpen ? "mobile-sidebar-open" : ""
      }`}
    >
      <aside className="arena-sidebar" aria-label="Workspace navigation">
        <div className="sidebar-brand-row">
          <div className="arena-mark" aria-hidden>
            A
          </div>
          <span className="sidebar-brand">LLM Arena</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="sidebar-toggle"
            aria-label={
              mobileSidebarOpen || !sidebarCollapsed ? "Collapse sidebar" : "Expand sidebar"
            }
            onClick={() => {
              setMobileSidebarOpen(false);
              setSidebarCollapsed((collapsed) => !collapsed);
            }}
          >
            {mobileSidebarOpen || !sidebarCollapsed ? (
              <PanelLeftClose aria-hidden />
            ) : (
              <PanelLeftOpen aria-hidden />
            )}
          </Button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <button className="sidebar-nav-item is-active" type="button" aria-current="page">
            <LayoutPanelTop aria-hidden />
            <span>Arena</span>
          </button>
          <button className="sidebar-nav-item" type="button">
            <Trophy aria-hidden />
            <span>Leaderboard</span>
          </button>
          <Link className="sidebar-nav-item" href="/models">
            <Bot aria-hidden />
            <span>Models</span>
          </Link>
        </nav>

        <section className="thread-list" aria-labelledby="thread-list-title">
          <div className="thread-list-heading">
            <span id="thread-list-title">Your threads</span>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="New thread" disabled>
              <Plus aria-hidden />
            </Button>
          </div>
          <div className="thread-list-items">
            {threads.map((thread) => (
              <button
                key={thread.title}
                className={`thread-list-item ${thread.active ? "is-active" : ""}`}
                type="button"
                aria-current={thread.active ? "page" : undefined}
              >
                <span className="thread-list-title">{thread.title}</span>
                <span className="thread-list-time">{thread.time}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="sidebar-footer">
          <Button type="button" variant="ghost" size="icon" aria-label="Account" disabled>
            <UserRound aria-hidden />
          </Button>
          <ThemeToggle />
        </div>
      </aside>

      <section className="arena-workspace">
        <header className="arena-topbar">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu aria-hidden />
          </Button>
          <div className="thread-identity">
            <p className="breadcrumb">Arena / Your threads</p>
            <h1>Mutexes, simply</h1>
          </div>
          <div className="topbar-actions">
            <div className="model-records" aria-label="Thread model records">
              {models.map((model) => (
                <div className="model-record" key={model.id} title={`${model.name}: won 0 / 0`}>
                  <span className="model-initial" aria-hidden>
                    {model.name.slice(0, 1)}
                  </span>
                  <span className="model-record-value">0 / 0</span>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Thread options" disabled>
              <MoreHorizontal aria-hidden />
            </Button>
          </div>
        </header>

        <div className="arena-scroll-region">
          <section className="arena-intro" aria-labelledby="arena-title">
            <div>
              <p className="eyebrow">Sample thread</p>
              <h2 id="arena-title">Compare an explanation</h2>
              <p>Ask the same question once, then choose the response that reads best.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMetricsVisible((visible) => !visible)}
            >
              {metricsVisible ? "Hide metrics" : "Show metrics"}
            </Button>
          </section>

          <section className="response-grid" aria-label="Model response placeholders">
            {models.map((model) => (
              <Card className="response-card" key={model.id}>
                <CardHeader className="response-card-header">
                  <div className="response-model">
                    <span className="model-initial" aria-hidden>
                      {model.name.slice(0, 1)}
                    </span>
                    <CardTitle>{model.name}</CardTitle>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`${model.name} options`}
                    disabled
                  >
                    <MoreHorizontal aria-hidden />
                  </Button>
                </CardHeader>
                <CardContent className="response-card-content">
                  <p className="response-placeholder">Ready for a model response.</p>
                  <div className="response-placeholder-lines" aria-hidden>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-11/12" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </CardContent>
                <CardFooter className="response-card-footer">
                  {metricsVisible ? (
                    <div className="response-metrics">
                      <span>TTFT --</span>
                      <span>Speed --</span>
                      <span>Tokens --</span>
                    </div>
                  ) : (
                    <span className="metric-hidden">Metrics hidden</span>
                  )}
                  <Button type="button" variant="outline" size="sm" disabled>
                    Pick response
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {catalogStatus === "loading" ? (
              <p className="catalog-state">Loading free models…</p>
            ) : null}
            {catalogStatus === "error" ? (
              <div className="catalog-state" role="status">
                <p>The model list is unavailable right now.</p>
                <Button type="button" variant="outline" size="sm" onClick={refreshCatalog}>
                  Retry
                </Button>
              </div>
            ) : null}
            {catalogStatus === "ready" && models.length === 0 ? (
              <p className="catalog-state">Add at least one model to start comparing answers.</p>
            ) : null}
          </section>
        </div>

        <form className="prompt-composer" onSubmit={(event) => event.preventDefault()}>
          <div className="composer-models" aria-label="Selected models">
            {models.map((model) => (
              <span className="composer-model" key={model.id}>
                <span className="model-initial" aria-hidden>
                  {model.name.slice(0, 1)}
                </span>
                {model.name}
                <button
                  className="composer-model-remove"
                  type="button"
                  aria-label={`Remove ${model.name}`}
                  onClick={() => removeModel(model.id)}
                >
                  <X aria-hidden />
                </button>
              </span>
            ))}
            <ModelPicker
              catalog={catalog}
              selectedIds={selectedIds}
              status={catalogStatus}
              onSelect={addModel}
              onRetry={refreshCatalog}
            />
          </div>
          <textarea
            className="composer-input"
            aria-label="Prompt"
            placeholder="Ask the arena anything"
            rows={2}
          />
          <Button type="submit" size="icon" aria-label="Send prompt" disabled={models.length === 0}>
            <Send aria-hidden />
          </Button>
        </form>
      </section>
    </main>
  );
}
