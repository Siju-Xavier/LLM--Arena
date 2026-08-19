"use client";

import { Check, Plus } from "lucide-react";

import type { CatalogModel } from "@/app/arena/lib/models";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ModelPickerProps {
  readonly catalog: readonly CatalogModel[];
  readonly selectedIds: readonly string[];
  readonly status: "loading" | "ready" | "error";
  readonly onSelect: (modelId: string) => void;
  readonly onRetry: () => void;
  readonly disabled?: boolean;
}

function formatContextWindow(contextLength: number): string {
  return `${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(contextLength)} context`;
}

export function ModelPicker({
  catalog,
  selectedIds,
  status,
  onSelect,
  onRetry,
  disabled = false,
}: ModelPickerProps) {
  const availableModels = catalog.filter((model) => !selectedIds.includes(model.id));
  const isFull = selectedIds.length >= 3;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || isFull || status === "loading"}
        >
          <Plus aria-hidden />
          Add model
        </Button>
      </PopoverTrigger>
      <PopoverContent className="model-picker-content" aria-label="Add a model">
        <div className="model-picker-heading">
          <div>
            <p className="eyebrow">Free models</p>
            <p>Choose up to three models to compare.</p>
          </div>
          <span className="model-picker-count">{selectedIds.length} / 3</span>
        </div>
        {status === "error" ? (
          <div className="model-picker-message" role="status">
            <p>The model list is unavailable right now.</p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : null}
        {status === "loading" ? <p className="model-picker-message">Loading free models…</p> : null}
        {status === "ready" && availableModels.length === 0 ? (
          <p className="model-picker-message">All available slots are selected.</p>
        ) : null}
        {status === "ready" && availableModels.length > 0 ? (
          <div className="model-picker-list">
            {availableModels.map((model) => (
              <button
                className="model-picker-option"
                key={model.id}
                type="button"
                onClick={() => onSelect(model.id)}
              >
                <span className="model-initial" aria-hidden>
                  {model.name.slice(0, 1)}
                </span>
                <span className="model-picker-option-copy">
                  <span>{model.name}</span>
                  <small>{formatContextWindow(model.contextLength)}</small>
                </span>
                <Check aria-hidden />
              </button>
            ))}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
