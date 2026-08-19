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
} from "lucide-react";
import { useState } from "react";

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

const models = [
  { name: "Llama 3.3", shortName: "L", record: "0 / 0" },
  { name: "Gemini Flash", shortName: "G", record: "0 / 0" },
  { name: "DeepSeek R1", shortName: "D", record: "0 / 0" },
];

export function ArenaShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [metricsVisible, setMetricsVisible] = useState(true);

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
          <button className="sidebar-nav-item" type="button">
            <Bot aria-hidden />
            <span>Models</span>
          </button>
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
                <div
                  className="model-record"
                  key={model.name}
                  title={`${model.name}: won ${model.record}`}
                >
                  <span className="model-initial" aria-hidden>
                    {model.shortName}
                  </span>
                  <span className="model-record-value">{model.record}</span>
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
              <Card className="response-card" key={model.name}>
                <CardHeader className="response-card-header">
                  <div className="response-model">
                    <span className="model-initial" aria-hidden>
                      {model.shortName}
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
          </section>
        </div>

        <form className="prompt-composer" onSubmit={(event) => event.preventDefault()}>
          <div className="composer-models" aria-label="Selected placeholder models">
            {models.map((model) => (
              <span className="composer-model" key={model.name}>
                <span className="model-initial" aria-hidden>
                  {model.shortName}
                </span>
                {model.name}
              </span>
            ))}
            <Button type="button" variant="ghost" size="sm" disabled>
              <Plus aria-hidden />
              Add model
            </Button>
          </div>
          <textarea
            className="composer-input"
            aria-label="Prompt"
            placeholder="Ask the arena anything"
            rows={2}
          />
          <Button type="submit" size="icon" aria-label="Send prompt" disabled>
            <Send aria-hidden />
          </Button>
        </form>
      </section>
    </main>
  );
}
