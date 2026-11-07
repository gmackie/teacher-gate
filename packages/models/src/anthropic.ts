// An adapter for Claude through the official Anthropic SDK. The default model is Claude Haiku 5.5
// for cost; Claude Sonnet 5.5 is the stronger choice. Current Claude models reject sampling
// parameters, so `temperature` and `seed` are not sent; effort defaults to `low`, which suits
// a bounded extraction task like drafting rubric findings.
import Anthropic from "@anthropic-ai/sdk";
import type { ModelAdapter, ModelRequest, ModelResponse } from "@teacher-gate/core";

/** Options for {@link AnthropicModel}. */
export interface AnthropicOptions {
  /** Default `claude-haiku-5-5`. */
  model?: string;
  /** Defaults to the SDK's own credential resolution (`ANTHROPIC_API_KEY`, then others). */
  apiKey?: string;
  effort?: "low" | "medium" | "high";
  client?: Anthropic;
}

/** Thrown when Claude declines a request (`stop_reason: "refusal"`). */
export class ModelRefusal extends Error {
  constructor(readonly category: string | null) {
    super(`The model declined the request${category === null ? "" : ` (${category})`}.`);
    this.name = "ModelRefusal";
  }
}

/** Claude through the Messages API. */
export class AnthropicModel implements ModelAdapter {
  readonly label: string;
  readonly #client: Anthropic;
  readonly #model: string;
  readonly #effort: "low" | "medium" | "high";
  constructor(options: AnthropicOptions = {}) {
    this.#model = options.model ?? "claude-haiku-5-5";
    this.#effort = options.effort ?? "low";
    this.#client = options.client ?? new Anthropic(options.apiKey === undefined ? {} : { apiKey: options.apiKey });
    this.label = `anthropic/${this.#model}`;
  }
  async complete(request: ModelRequest): Promise<ModelResponse> {
    const response = await this.#client.messages.create({
      model: this.#model,
      // Room for adaptive thinking on top of the requested answer length.
      max_tokens: request.maxOutputTokens + 8000,
      system: request.system,
      output_config: { effort: this.#effort },
      messages: [{ role: "user", content: request.user }],
    });
    if (response.stop_reason === "refusal") throw new ModelRefusal(response.stop_details?.category ?? null);
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return { text, model: response.model, usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens } };
  }
}
