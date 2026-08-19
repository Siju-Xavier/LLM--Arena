import { OPENROUTER_API_KEY } from "@/app/env";

const OPENROUTER_MODELS_URL =
  "https://openrouter.ai/api/v1/models?input_modalities=text&output_modalities=text&sort=context-high-to-low";

export interface CatalogModel {
  readonly id: string;
  readonly name: string;
  readonly contextLength: number;
  readonly pricing: {
    readonly prompt: string;
    readonly completion: string;
  };
}

interface OpenRouterModel {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly context_length?: unknown;
  readonly pricing?: unknown;
  readonly architecture?: unknown;
}

interface FreeOpenRouterModel {
  readonly id: string;
  readonly name: string;
  readonly context_length: number;
  readonly pricing: Readonly<Record<string, string>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFreePrice(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Number(value)) && Number(value) === 0;
}

function isFreeTextModel(model: OpenRouterModel): model is FreeOpenRouterModel {
  if (
    typeof model.id !== "string" ||
    typeof model.name !== "string" ||
    typeof model.context_length !== "number" ||
    !isRecord(model.pricing) ||
    !isRecord(model.architecture)
  ) {
    return false;
  }

  const inputModalities = model.architecture.input_modalities;
  const outputModalities = model.architecture.output_modalities;
  const prices = Object.values(model.pricing);

  return (
    Array.isArray(inputModalities) &&
    inputModalities.includes("text") &&
    Array.isArray(outputModalities) &&
    outputModalities.includes("text") &&
    prices.length > 0 &&
    prices.every(isFreePrice) &&
    isFreePrice(model.pricing.prompt) &&
    isFreePrice(model.pricing.completion)
  );
}

function toCatalogModel(model: FreeOpenRouterModel): CatalogModel {
  return {
    id: model.id,
    name: model.name,
    contextLength: model.context_length,
    pricing: {
      prompt: model.pricing.prompt,
      completion: model.pricing.completion,
    },
  };
}

/** Fetch the current text-only OpenRouter models that are free for every priced unit. */
export async function getFreeModels(): Promise<readonly CatalogModel[]> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter model catalog returned ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error("OpenRouter returned an invalid model catalog.");
  }

  return payload.data
    .filter(isRecord)
    .map((model) => model as OpenRouterModel)
    .filter(isFreeTextModel)
    .map(toCatalogModel)
    .sort((first, second) => second.contextLength - first.contextLength);
}
