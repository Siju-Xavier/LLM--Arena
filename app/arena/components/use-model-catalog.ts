"use client";

import { useCallback, useEffect, useState } from "react";

import type { CatalogModel } from "@/app/arena/lib/models";

interface CatalogResponse {
  readonly models?: unknown;
}

function isCatalogModel(value: unknown): value is CatalogModel {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const model = value as Record<string, unknown>;
  return (
    typeof model.id === "string" &&
    typeof model.name === "string" &&
    typeof model.contextLength === "number" &&
    typeof model.pricing === "object" &&
    model.pricing !== null
  );
}

async function requestCatalog(): Promise<readonly CatalogModel[]> {
  const response = await fetch("/api/models");
  const body: CatalogResponse = await response.json().catch(() => ({}));

  if (!response.ok || !Array.isArray(body.models)) {
    throw new Error("The model list is unavailable right now.");
  }

  return body.models.filter(isCatalogModel);
}

export function useModelCatalog() {
  const [models, setModels] = useState<readonly CatalogModel[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      setModels(await requestCatalog());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    void requestCatalog()
      .then((catalog) => {
        if (isCurrent) {
          setModels(catalog);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (isCurrent) {
          setStatus("error");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return { models, status, refresh } as const;
}
