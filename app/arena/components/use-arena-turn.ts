"use client";

import { useCallback, useMemo, useState } from "react";

type AnswerStatus = "queued" | "streaming" | "completed" | "error";

export interface ArenaAnswer {
  readonly id: string;
  readonly modelId: string;
  readonly status: AnswerStatus;
  readonly content: string;
  readonly error: string | null;
  readonly timeToFirstTokenMs: number | null;
  readonly tokensPerSecond: number | null;
  readonly totalTokens: number | null;
}

interface CreatedTurn {
  readonly threadId: string;
  readonly turnId: string;
  readonly answers: readonly { readonly id: string; readonly modelId: string }[];
}

interface SseMessage {
  readonly event: string;
  readonly data: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function responseError(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  return isRecord(body) && typeof body.error === "string" ? body.error : fallback;
}

function parseSseFrame(frame: string): SseMessage | null {
  const lines = frame.split("\n");
  const event = lines
    .find((line) => line.startsWith("event:"))
    ?.slice(6)
    .trim();
  const data = lines
    .find((line) => line.startsWith("data:"))
    ?.slice(5)
    .trim();
  if (!event || !data) return null;
  try {
    const parsed: unknown = JSON.parse(data);
    return isRecord(parsed) ? { event, data: parsed } : null;
  } catch {
    return null;
  }
}

async function consumeSse(
  response: Response,
  onMessage: (message: SseMessage) => void
): Promise<void> {
  if (!response.body) throw new Error("The model returned no stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    buffer += decoder.decode(result.value, { stream: true }).replaceAll("\r\n", "\n");
    const frames = buffer.split("\n\n");
    buffer = frames.at(-1) ?? "";
    frames
      .slice(0, -1)
      .map(parseSseFrame)
      .filter((frame): frame is SseMessage => frame !== null)
      .forEach(onMessage);
  }
}

export function useArenaTurn(initialThreadId: string | null = null) {
  const [threadId, setThreadId] = useState<string | null>(initialThreadId);
  const [turnId, setTurnId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Readonly<Record<string, ArenaAnswer>>>({});
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const updateAnswer = useCallback((modelId: string, update: Partial<ArenaAnswer>) => {
    setAnswers((current) => {
      const answer = current[modelId];
      return answer ? { ...current, [modelId]: { ...answer, ...update } } : current;
    });
  }, []);

  const streamAnswer = useCallback(
    async (answer: CreatedTurn["answers"][number]) => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answerId: answer.id }),
        });
        if (!response.ok)
          throw new Error(await responseError(response, "This model could not be reached."));
        await consumeSse(response, ({ event, data }) => {
          if (event === "start") updateAnswer(answer.modelId, { status: "streaming" });
          if (event === "token" && typeof data.text === "string") {
            setAnswers((current) => {
              const existing = current[answer.modelId];
              return existing
                ? {
                    ...current,
                    [answer.modelId]: { ...existing, content: existing.content + data.text },
                  }
                : current;
            });
          }
          if (event === "metrics") {
            updateAnswer(answer.modelId, {
              timeToFirstTokenMs:
                typeof data.timeToFirstTokenMs === "number" ? data.timeToFirstTokenMs : null,
              tokensPerSecond:
                typeof data.tokensPerSecond === "number" ? data.tokensPerSecond : null,
              totalTokens: typeof data.totalTokens === "number" ? data.totalTokens : null,
            });
          }
          if (event === "complete") updateAnswer(answer.modelId, { status: "completed" });
          if (event === "error") {
            updateAnswer(answer.modelId, {
              status: "error",
              error:
                typeof data.message === "string"
                  ? data.message
                  : "This model could not finish its answer.",
            });
          }
        });
      } catch (streamError) {
        updateAnswer(answer.modelId, {
          status: "error",
          error:
            streamError instanceof Error
              ? streamError.message
              : "This model could not finish its answer.",
        });
      }
    },
    [updateAnswer]
  );

  const submit = useCallback(
    async (nextPrompt: string, modelIds: readonly string[]) => {
      if (isRunning) return false;
      setError(null);
      setWinnerId(null);
      setIsRunning(true);
      try {
        const response = await fetch("/api/turns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, prompt: nextPrompt, modelIds }),
        });
        if (!response.ok)
          throw new Error(await responseError(response, "The prompt could not be started."));
        const created = (await response.json()) as CreatedTurn;
        setThreadId(created.threadId);
        setTurnId(created.turnId);
        setPrompt(nextPrompt);
        setAnswers(
          Object.fromEntries(
            created.answers.map((answer) => [
              answer.modelId,
              {
                ...answer,
                status: "queued" as const,
                content: "",
                error: null,
                timeToFirstTokenMs: null,
                tokensPerSecond: null,
                totalTokens: null,
              },
            ])
          )
        );
        await Promise.allSettled(created.answers.map(streamAnswer));
        return created.threadId;
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "The prompt could not be started."
        );
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [isRunning, streamAnswer, threadId]
  );

  const completedCount = useMemo(
    () => Object.values(answers).filter((answer) => answer.status === "completed").length,
    [answers]
  );

  const retry = useCallback(
    async (modelId: string) => {
      const answer = answers[modelId];
      if (!answer || answer.status !== "error" || isRunning) return;
      updateAnswer(modelId, { status: "queued", content: "", error: null });
      setIsRunning(true);
      await streamAnswer(answer);
      setIsRunning(false);
    },
    [answers, isRunning, streamAnswer, updateAnswer]
  );

  const vote = useCallback(
    async (answerId: string) => {
      if (!turnId || winnerId || completedCount < 2) return;
      setError(null);
      setIsVoting(true);
      try {
        const response = await fetch(`/api/turns/${turnId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answerId }),
        });
        if (!response.ok)
          throw new Error(await responseError(response, "Your vote could not be saved."));
        setWinnerId(answerId);
      } catch (voteError) {
        setError(voteError instanceof Error ? voteError.message : "Your vote could not be saved.");
      } finally {
        setIsVoting(false);
      }
    },
    [completedCount, turnId, winnerId]
  );

  return {
    answers,
    completedCount,
    error,
    isRunning,
    isVoting,
    prompt,
    retry,
    submit,
    vote,
    winnerId,
    threadId,
    turnId,
  };
}
