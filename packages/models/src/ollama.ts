// An adapter for Ollama's native chat API, for fully local open-weight models. It asks for JSON
// output with `format: "json"`, sets temperature 0 and a fixed seed for reproducibility.
import type { ModelAdapter, ModelRequest, ModelResponse } from "@teacher-gate/core";

/** Options for {@link OllamaModel}. */
export interface OllamaOptions {
  model: string;
  /** Default `http://localhost:11434`, or `OLLAMA_HOST`. */
  host?: string;
  /** Context window to request, in tokens. Default 16384. */
  numCtx?: number;
  seed?: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

interface OllamaChat {
  model?: string;
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

/** A model served by Ollama. */
export class OllamaModel implements ModelAdapter {
  readonly label: string;
  constructor(readonly options: OllamaOptions) {
    this.label = `ollama/${options.model}`;
  }
  async complete(request: ModelRequest): Promise<ModelResponse> {
    const o = this.options;
    const host = (o.host ?? "http://localhost:11434").replace(/\/$/, "");
    const res = await (o.fetch ?? fetch)(`${host}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: o.model,
        stream: false,
        ...(request.jsonSchema !== undefined ? { format: request.jsonSchema } : request.json ? { format: "json" } : {}),
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        options: { temperature: request.temperature ?? 0, seed: request.seed ?? o.seed ?? 42, num_predict: request.maxOutputTokens, num_ctx: o.numCtx ?? 16384 },
      }),
      signal: AbortSignal.timeout(o.timeoutMs ?? 600_000),
    });
    if (!res.ok) throw new Error(`${this.label} returned HTTP ${res.status}`);
    const data = (await res.json()) as OllamaChat;
    const text = data.message?.content;
    if (typeof text !== "string") throw new Error(`${this.label} returned no message`);
    return { text, model: data.model ?? o.model, usage: { inputTokens: data.prompt_eval_count ?? 0, outputTokens: data.eval_count ?? 0 } };
  }
}
