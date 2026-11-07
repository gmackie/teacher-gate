// An adapter for any OpenAI-compatible Chat Completions endpoint: OpenAI itself, vLLM, LM Studio,
// llama.cpp's server, Together, Groq and others. It uses `fetch`, with no SDK.
import type { ModelAdapter, ModelRequest, ModelResponse } from "@teacher-gate/core";

/** Options for {@link OpenAICompatibleModel}. */
export interface OpenAICompatibleOptions {
  /** e.g. `https://api.openai.com/v1` or `http://localhost:8000/v1`. */
  baseUrl: string;
  model: string;
  apiKey?: string;
  /** The label prefix, e.g. `openai` or `vllm`. */
  provider?: string;
  /** Send `response_format: {type: "json_object"}` when JSON is asked for. Default true. */
  jsonMode?: boolean;
  /** Send `temperature`. Some reasoning models reject it. Default true. */
  sendTemperature?: boolean;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

interface ChatCompletion {
  model?: string;
  choices?: { message?: { content?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** A model behind an OpenAI-compatible endpoint. */
export class OpenAICompatibleModel implements ModelAdapter {
  readonly label: string;
  constructor(readonly options: OpenAICompatibleOptions) {
    this.label = `${options.provider ?? "openai"}/${options.model}`;
  }
  async complete(request: ModelRequest): Promise<ModelResponse> {
    const o = this.options;
    const body: Record<string, unknown> = {
      model: o.model,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
      max_tokens: request.maxOutputTokens,
    };
    if (o.sendTemperature !== false) body.temperature = request.temperature ?? 0;
    if (request.seed !== undefined) body.seed = request.seed;
    if (request.json && o.jsonMode !== false) body.response_format = { type: "json_object" };
    const res = await (o.fetch ?? fetch)(`${o.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(o.apiKey === undefined ? {} : { authorization: `Bearer ${o.apiKey}` }) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(o.timeoutMs ?? 300_000),
    });
    if (!res.ok) throw new Error(`${this.label} returned HTTP ${res.status}`);
    const data = (await res.json()) as ChatCompletion;
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw new Error(`${this.label} returned no message`);
    return { text, model: data.model ?? o.model, usage: { inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0 } };
  }
}

/** A vLLM server's OpenAI-compatible endpoint, by default `http://localhost:8000/v1`. */
export function vllmModel(model: string, baseUrl = "http://localhost:8000/v1", apiKey?: string): OpenAICompatibleModel {
  return new OpenAICompatibleModel({ baseUrl, model, provider: "vllm", ...(apiKey === undefined ? {} : { apiKey }) });
}
