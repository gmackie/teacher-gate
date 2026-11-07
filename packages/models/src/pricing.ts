// Prices and a spend meter. Prices are per million tokens in US dollars, as published by each
// provider when this table was written (Anthropic: 2026-10-06). Local open-weight models cost $0.
// The meter is an estimate from reported token usage; reconcile it with your provider's bill.
import type { ModelAdapter, ModelRequest, ModelResponse } from "@teacher-gate/core";

/** Input and output prices in USD per million tokens. */
export interface Price {
  input: number;
  output: number;
}

/** Known prices. Unknown hosted models are treated as unpriced and refused by a capped meter. */
export const PRICES: Readonly<Record<string, Price>> = {
  "anthropic/claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "anthropic/claude-sonnet-5-5": { input: 2, output: 10 },
  "anthropic/claude-opus-5-5": { input: 4, output: 20 },
};

/** The price of a model by label; `ollama/*` and `vllm/*` (self-hosted) are free. */
export function priceOf(label: string): Price | undefined {
  if (label.startsWith("ollama/") || label.startsWith("vllm/") || label.startsWith("scripted/")) return { input: 0, output: 0 };
  return PRICES[label];
}

/** The estimated cost of one response, in USD. */
export function costOf(label: string, usage: ModelResponse["usage"]): number | undefined {
  const p = priceOf(label);
  return p === undefined ? undefined : (usage.inputTokens * p.input + usage.outputTokens * p.output) / 1e6;
}

/** Thrown when a request would go past a spend cap. */
export class SpendCapReached extends Error {
  constructor(readonly spentUsd: number, readonly capUsd: number) {
    super(`Spend cap reached: $${spentUsd.toFixed(4)} of $${capUsd.toFixed(2)}.`);
    this.name = "SpendCapReached";
  }
}

/**
 * Wraps an adapter, adding up estimated spend and refusing new requests once `capUsd` is reached.
 * A model with no known price is refused under a cap, so a cap can never be silently bypassed.
 */
export class MeteredModel implements ModelAdapter {
  spentUsd = 0;
  requests = 0;
  inputTokens = 0;
  outputTokens = 0;
  constructor(readonly inner: ModelAdapter, readonly capUsd = Number.POSITIVE_INFINITY) {}
  get label(): string {
    return this.inner.label;
  }
  async complete(request: ModelRequest): Promise<ModelResponse> {
    if (Number.isFinite(this.capUsd) && priceOf(this.label) === undefined) throw new Error(`No price is known for ${this.label}, so it cannot run under a spend cap.`);
    if (this.spentUsd >= this.capUsd) throw new SpendCapReached(this.spentUsd, this.capUsd);
    const response = await this.inner.complete(request);
    this.requests++;
    this.inputTokens += response.usage.inputTokens;
    this.outputTokens += response.usage.outputTokens;
    this.spentUsd += costOf(this.label, response.usage) ?? 0;
    return response;
  }
}
