"use client";

import {
  Bot,
  LayoutPanelTop,
  LoaderCircle,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

import { ModelPicker } from "@/app/arena/components/model-picker";
import { useModelCatalog } from "@/app/arena/components/use-model-catalog";
import { useArenaTurn } from "@/app/arena/components/use-arena-turn";
import { ThemeToggle } from "@/app/theme/toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  recordsForThread,
  type PersistedThread,
  type PersistedTurn,
  type ThreadSummary,
} from "@/app/arena/lib/threads";

type LoadStatus = "idle" | "loading" | "ready" | "error" | "not-found";

function formatSeconds(milliseconds: number | null | undefined): string {
  return milliseconds == null ? "--" : `${(milliseconds / 1000).toFixed(2)}s`;
}

function formatSpeed(tokensPerSecond: number | null | undefined): string {
  return tokensPerSecond == null ? "--" : `${tokensPerSecond.toFixed(1)} t/s`;
}

function formatThreadTime(value: string): string {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface ArenaShellProps {
  readonly initialThreadId?: string;
  readonly initialThread?: PersistedThread;
  readonly initialIsOwner?: boolean;
}

function PersistedTurnView({
  turn,
  modelNames,
  metricsVisible,
}: {
  readonly turn: PersistedTurn;
  readonly modelNames: ReadonlyMap<string, string>;
  readonly metricsVisible: boolean;
}) {
  return (
    <section className="history-turn" aria-labelledby={`turn-${turn.id}`}>
      <div className="history-prompt">
        <p className="eyebrow">You asked</p>
        <h3 id={`turn-${turn.id}`}>{turn.prompt}</h3>
      </div>
      <div className="response-grid" aria-label={`Responses to ${turn.prompt}`}>
        {turn.answers.map((answer) => {
          const modelName = modelNames.get(answer.modelId) ?? answer.modelId;
          const isWinner = turn.winnerId === answer.id;
          return (
            <Card
              className={`response-card history-response ${isWinner ? "is-winner" : ""}`}
              key={answer.id}
            >
              <CardHeader className="response-card-header">
                <div className="response-model">
                  <span className="model-initial" aria-hidden>
                    {modelName.slice(0, 1).toUpperCase()}
                  </span>
                  <CardTitle>{modelName}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="response-card-content">
                {isWinner ? (
                  <p className="winner-label">
                    <Trophy aria-hidden /> Winner
                  </p>
                ) : null}
                {answer.content ? <p className="response-copy">{answer.content}</p> : null}
                {answer.status === "FAILED" ? (
                  <p className="response-error">This model could not finish its answer.</p>
                ) : null}
                {answer.status === "PENDING" || answer.status === "STREAMING" ? (
                  <p className="response-loading">This answer did not finish.</p>
                ) : null}
              </CardContent>
              <CardFooter className="response-card-footer">
                {metricsVisible ? (
                  <div className="response-metrics">
                    <span>TTFT {formatSeconds(answer.timeToFirstTokenMs)}</span>
                    <span>Speed {formatSpeed(answer.tokensPerSecond)}</span>
                    <span>Tokens {answer.totalTokens ?? "--"}</span>
                  </div>
                ) : (
                  <span className="metric-hidden">Metrics hidden</span>
                )}
                {isWinner ? <span className="history-winner-mark">Picked</span> : null}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function ArenaShell({
  initialThreadId,
  initialThread = undefined,
  initialIsOwner = false,
}: ArenaShellProps) {
  const { isSignedIn, isLoaded: isAuthLoaded } = useUser();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [metricsVisible, setMetricsVisible] = useState(true);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [draft, setDraft] = useState("");
  const [threads, setThreads] = useState<readonly ThreadSummary[]>([]);
  const [threadListStatus, setThreadListStatus] = useState<LoadStatus>("loading");
  const [persistedThread, setPersistedThread] = useState<PersistedThread | null>(
    initialThread ?? null
  );
  const [isThreadOwner, setIsThreadOwner] = useState(initialIsOwner);
  const [threadStatus, setThreadStatus] = useState<LoadStatus>(
    initialThread ? "ready" : initialThreadId ? "loading" : "idle"
  );
  const initializedSelection = useRef(false);
  const { models: catalog, status: catalogStatus, refresh: refreshCatalog } = useModelCatalog();
  const models = useMemo(
    () => catalog.filter((model) => selectedIds.includes(model.id)),
    [catalog, selectedIds]
  );
  const arena = useArenaTurn(initialThreadId ?? null);

  const loadThreads = useCallback(async () => {
    try {
      const response = await fetch("/api/threads");
      if (!response.ok) throw new Error("THREADS");
      const result = (await response.json()) as { readonly threads: readonly ThreadSummary[] };
      setThreads(result.threads);
      setThreadListStatus("ready");
    } catch {
      setThreadListStatus("error");
    }
  }, []);

  const refreshPersistedThread = useCallback(async (threadId: string) => {
    const response = await fetch(`/api/threads/${threadId}`);
    if (!response.ok) return;
    const result = (await response.json()) as {
      readonly thread: PersistedThread;
      readonly isOwner: boolean;
    };
    setPersistedThread(result.thread);
    setIsThreadOwner(result.isOwner);
    setThreadStatus("ready");
  }, []);

  useEffect(() => {
    if (!isAuthLoaded) return;
    if (!isSignedIn) return;
    let cancelled = false;
    void fetch("/api/threads")
      .then(async (response) => {
        if (!response.ok) throw new Error("THREADS");
        return (await response.json()) as { readonly threads: readonly ThreadSummary[] };
      })
      .then((result) => {
        if (!cancelled) {
          setThreads(result.threads);
          setThreadListStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setThreadListStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthLoaded, isSignedIn]);

  useEffect(() => {
    if (!initialThreadId || !isAuthLoaded) return;
    let cancelled = false;
    const loadThread = async () => {
      if (!initialThread) setThreadStatus("loading");
      try {
        const response = await fetch(`/api/threads/${initialThreadId}`);
        if (cancelled) return;
        if (response.status === 404) {
          setThreadStatus("not-found");
          return;
        }
        if (!response.ok) throw new Error("THREAD");
        const result = (await response.json()) as {
          readonly thread: PersistedThread;
          readonly isOwner: boolean;
        };
        setPersistedThread(result.thread);
        setIsThreadOwner(result.isOwner);
        setThreadStatus("ready");
      } catch {
        if (!cancelled) setThreadStatus("error");
      }
    };
    void loadThread();
    return () => {
      cancelled = true;
    };
  }, [initialThread, initialThreadId, isAuthLoaded, isSignedIn]);

  const visibleThreadStatus = threadStatus;
  const isReadOnlyThread = Boolean(initialThreadId && !isThreadOwner);

  useEffect(() => {
    if (
      catalogStatus === "ready" &&
      (!initialThreadId || visibleThreadStatus !== "loading") &&
      !initializedSelection.current
    ) {
      initializedSelection.current = true;
      const latestModelIds =
        persistedThread?.turns.at(-1)?.answers.map((answer) => answer.modelId) ?? [];
      const availableLatestIds = latestModelIds.filter((id) =>
        catalog.some((model) => model.id === id)
      );
      setSelectedIds(
        (availableLatestIds.length > 0
          ? availableLatestIds
          : catalog.map((model) => model.id)
        ).slice(0, 3)
      );
    }
  }, [catalog, catalogStatus, initialThreadId, persistedThread, visibleThreadStatus]);

  const modelNames = useMemo(
    () => new Map(catalog.map((model) => [model.id, model.name])),
    [catalog]
  );
  const modelRecords = useMemo(() => {
    const persistedRecords = recordsForThread(persistedThread);
    const records = new Map(persistedRecords.map((record) => [record.modelId, record]));
    models.forEach((model) => {
      const current = records.get(model.id) ?? { modelId: model.id, wins: 0, appearances: 0 };
      const liveAnswer = arena.answers[model.id];
      records.set(model.id, {
        ...current,
        appearances: current.appearances + (liveAnswer ? 1 : 0),
        wins: current.wins + (liveAnswer && arena.winnerId === liveAnswer.id ? 1 : 0),
      });
    });
    return [...records.values()];
  }, [arena.answers, arena.winnerId, models, persistedThread]);

  const addModel = (modelId: string) => {
    setSelectedIds((current) =>
      current.length < 3 && !current.includes(modelId) ? [...current, modelId] : current
    );
  };

  const removeModel = (modelId: string) => {
    setSelectedIds((current) => current.filter((id) => id !== modelId));
  };

  const submitPrompt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = draft.trim();
    if (!prompt || models.length === 0 || arena.isRunning) return;
    const createdThreadId = await arena.submit(
      prompt,
      models.map((model) => model.id)
    );
    if (createdThreadId) {
      setDraft("");
      if (!initialThreadId) router.replace(`/threads/${createdThreadId}`);
      else await refreshPersistedThread(createdThreadId);
      void loadThreads();
    }
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
            <Button asChild variant="ghost" size="icon-xs">
              <Link href="/" aria-label="New thread">
                <Plus aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="thread-list-items">
            {(isSignedIn ? threads : []).map((thread) => (
              <Link
                key={thread.id}
                className={`thread-list-item ${thread.id === initialThreadId ? "is-active" : ""}`}
                href={`/threads/${thread.id}`}
                aria-current={thread.id === initialThreadId ? "page" : undefined}
                onClick={() => setMobileSidebarOpen(false)}
              >
                <span className="thread-list-title">{thread.title}</span>
                <span className="thread-list-time">{formatThreadTime(thread.updatedAt)}</span>
              </Link>
            ))}
            {isAuthLoaded && !isSignedIn ? (
              <p className="thread-list-message">Sign in to keep your comparisons.</p>
            ) : null}
            {isSignedIn && threadListStatus === "loading" ? (
              <p className="thread-list-message">Loading threads…</p>
            ) : null}
            {threadListStatus === "ready" && threads.length === 0 ? (
              <p className="thread-list-message">Your first comparison will appear here.</p>
            ) : null}
            {threadListStatus === "error" ? (
              <button
                className="thread-list-retry"
                type="button"
                onClick={() => void loadThreads()}
              >
                Could not load threads. Retry
              </button>
            ) : null}
          </div>
        </section>

        <div className="sidebar-footer">
          {isAuthLoaded && isSignedIn ? (
            <UserButton
              showName
              appearance={{
                elements: {
                  rootBox: "arena-user-button",
                  userButtonTrigger: "arena-user-trigger",
                  userButtonAvatarBox: "arena-user-avatar",
                },
              }}
            />
          ) : (
            <SignInButton mode="modal">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="account-sign-in"
                disabled={!isAuthLoaded}
              >
                <UserRound aria-hidden />
                <span>Sign in</span>
              </Button>
            </SignInButton>
          )}
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
            <p className="breadcrumb">
              Arena / {isReadOnlyThread ? "Shared thread" : "Your threads"}
            </p>
            <h1>{persistedThread?.title ?? arena.prompt ?? "New comparison"}</h1>
          </div>
          <div className="topbar-actions">
            <div className="model-records" aria-label="Thread model records">
              {modelRecords.map((record) => {
                const modelName = modelNames.get(record.modelId) ?? record.modelId;
                return (
                  <div
                    className="model-record"
                    key={record.modelId}
                    title={`${modelName}: won ${record.wins} of ${record.appearances}`}
                  >
                    <span className="model-initial" aria-hidden>
                      {modelName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="model-record-value">
                      {record.wins} / {record.appearances}
                    </span>
                  </div>
                );
              })}
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Thread options" disabled>
              <MoreHorizontal aria-hidden />
            </Button>
          </div>
        </header>

        <div className="arena-scroll-region">
          {visibleThreadStatus === "loading" ? (
            <div className="thread-page-state" role="status">
              <LoaderCircle className="is-spinning" aria-hidden /> Loading this thread…
            </div>
          ) : null}
          {visibleThreadStatus === "not-found" ? (
            <div className="thread-page-state" role="status">
              <p>This thread could not be found.</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/">Start a new comparison</Link>
              </Button>
            </div>
          ) : null}
          {visibleThreadStatus === "error" && initialThreadId ? (
            <div className="thread-page-state" role="status">
              <p>This thread could not be loaded.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refreshPersistedThread(initialThreadId)}
              >
                Retry
              </Button>
            </div>
          ) : null}
          {!initialThreadId || visibleThreadStatus === "ready" ? (
            <>
              <section className="arena-intro" aria-labelledby="arena-title">
                <div>
                  <p className="eyebrow">Live arena</p>
                  <h2 id="arena-title">
                    {arena.prompt || persistedThread ? "Compare the answers" : "Start a comparison"}
                  </h2>
                  <p>
                    {arena.prompt ??
                      "Ask the same question once, then choose the response that reads best."}
                  </p>
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

              {persistedThread?.turns
                .filter((turn) => turn.id !== arena.turnId)
                .map((turn) => (
                  <PersistedTurnView
                    key={turn.id}
                    turn={turn}
                    modelNames={modelNames}
                    metricsVisible={metricsVisible}
                  />
                ))}

              {arena.error ? (
                <p className="arena-error" role="alert">
                  {arena.error}
                </p>
              ) : null}

              {arena.prompt || !persistedThread ? (
                <section className="response-grid live-response-grid" aria-label="Model responses">
                  {models.map((model) => (
                    <Card
                      className={`response-card ${arena.winnerId === arena.answers[model.id]?.id ? "is-winner" : ""}`}
                      key={model.id}
                    >
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
                        {arena.winnerId === arena.answers[model.id]?.id ? (
                          <p className="winner-label">
                            <Trophy aria-hidden /> Winner
                          </p>
                        ) : null}
                        {arena.answers[model.id]?.content ? (
                          <p className="response-copy">{arena.answers[model.id].content}</p>
                        ) : null}
                        {arena.answers[model.id]?.status === "queued" ||
                        arena.answers[model.id]?.status === "streaming" ? (
                          <div className="response-loading" role="status">
                            <LoaderCircle aria-hidden />{" "}
                            {arena.answers[model.id].status === "queued"
                              ? "Connecting…"
                              : "Answering…"}
                          </div>
                        ) : null}
                        {arena.answers[model.id]?.status === "error" ? (
                          <div className="response-failure" role="status">
                            <p className="response-error">{arena.answers[model.id].error}</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={arena.isRunning || isReadOnlyThread}
                              onClick={() => void arena.retry(model.id)}
                            >
                              Retry model
                            </Button>
                          </div>
                        ) : null}
                        {!arena.answers[model.id] ? (
                          <>
                            <p className="response-placeholder">Ready for a model response.</p>
                            <div className="response-placeholder-lines" aria-hidden>
                              <Skeleton className="h-3 w-full" />
                              <Skeleton className="h-3 w-11/12" />
                              <Skeleton className="h-3 w-4/5" />
                            </div>
                          </>
                        ) : null}
                      </CardContent>
                      <CardFooter className="response-card-footer">
                        {metricsVisible ? (
                          <div className="response-metrics">
                            <span>
                              TTFT {formatSeconds(arena.answers[model.id]?.timeToFirstTokenMs)}
                            </span>
                            <span>
                              Speed {formatSpeed(arena.answers[model.id]?.tokensPerSecond)}
                            </span>
                            <span>Tokens {arena.answers[model.id]?.totalTokens ?? "--"}</span>
                          </div>
                        ) : (
                          <span className="metric-hidden">Metrics hidden</span>
                        )}
                        <Button
                          type="button"
                          variant={
                            arena.winnerId === arena.answers[model.id]?.id ? "secondary" : "outline"
                          }
                          size="sm"
                          disabled={
                            arena.completedCount < 2 ||
                            arena.answers[model.id]?.status !== "completed" ||
                            arena.isVoting ||
                            arena.winnerId !== null
                          }
                          onClick={() => {
                            const answer = arena.answers[model.id];
                            if (answer) void arena.vote(answer.id);
                          }}
                        >
                          {arena.winnerId === arena.answers[model.id]?.id
                            ? "Winner"
                            : "Pick response"}
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
                    <p className="catalog-state">
                      Add at least one model to start comparing answers.
                    </p>
                  ) : null}
                </section>
              ) : null}
            </>
          ) : null}
        </div>

        {isReadOnlyThread ? (
          <div className="prompt-composer" role="note" aria-label="Read-only shared thread">
            <p className="thread-list-message">
              {isSignedIn
                ? "This shared thread is read-only. Only its owner can continue it."
                : "You can read this shared thread without an account. Sign in to start your own comparison."}
            </p>
            {!isSignedIn ? (
              <SignInButton mode="modal">
                <Button type="button" size="sm" disabled={!isAuthLoaded}>
                  Sign in
                </Button>
              </SignInButton>
            ) : (
              <Button asChild size="sm">
                <Link href="/">Start a comparison</Link>
              </Button>
            )}
          </div>
        ) : (
          <form className="prompt-composer" onSubmit={submitPrompt}>
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
                    disabled={arena.isRunning}
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
                disabled={arena.isRunning}
              />
            </div>
            <textarea
              className="composer-input"
              aria-label="Prompt"
              placeholder="Ask the arena anything"
              rows={2}
              value={draft}
              maxLength={12000}
              disabled={arena.isRunning}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send prompt"
              disabled={models.length === 0 || !draft.trim() || arena.isRunning}
            >
              {arena.isRunning ? (
                <LoaderCircle className="is-spinning" aria-hidden />
              ) : (
                <Send aria-hidden />
              )}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
