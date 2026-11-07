// Bring your own keys: pick a model from environment variables, so no key is ever in code.
import type { ModelAdapter } from "@teacher-gate/core";
import { AnthropicModel } from "./anthropic";
import { OllamaModel } from "./ollama";
import { OpenAICompatibleModel, vllmModel } from "./openai-compatible";

/**
 * A model from the environment:
 * - `TEACHER_GATE_PROVIDER`: `anthropic`, `openai`, `ollama` or `vllm` (default `ollama`).
 * - `TEACHER_GATE_MODEL`: the provider's model name.
 * - Keys and hosts: `ANTHROPIC_API_KEY`; `OPENAI_API_KEY` and `OPENAI_BASE_URL`; `OLLAMA_HOST`;
 *   `VLLM_BASE_URL` and `VLLM_API_KEY`.
 */
export function modelFromEnv(rawEnv: Record<string, string | undefined> = process.env, override?: { provider?: string; model?: string }): ModelAdapter {
  // An empty variable counts as unset, so it never overrides an SDK's own credential resolution.
  const env = Object.fromEntries(Object.entries(rawEnv).filter(([, v]) => v !== undefined && v !== ""));
  const provider = override?.provider ?? env.TEACHER_GATE_PROVIDER ?? "ollama";
  const model = override?.model ?? env.TEACHER_GATE_MODEL;
  switch (provider) {
    case "anthropic":
      return new AnthropicModel({ ...(model === undefined ? {} : { model }), ...(env.ANTHROPIC_API_KEY === undefined ? {} : { apiKey: env.ANTHROPIC_API_KEY }) });
    case "openai":
      return new OpenAICompatibleModel({ baseUrl: env.OPENAI_BASE_URL ?? "https://api.openai.com/v1", model: model ?? "gpt-4o-mini", ...(env.OPENAI_API_KEY === undefined ? {} : { apiKey: env.OPENAI_API_KEY }) });
    case "vllm":
      if (model === undefined) throw new Error("Set TEACHER_GATE_MODEL to the model your vLLM server serves.");
      return vllmModel(model, env.VLLM_BASE_URL, env.VLLM_API_KEY);
    case "ollama":
      return new OllamaModel({ model: model ?? "qwen2.5:7b", ...(env.OLLAMA_HOST === undefined ? {} : { host: env.OLLAMA_HOST.startsWith("http") ? env.OLLAMA_HOST : `http://${env.OLLAMA_HOST}` }) });
    default:
      throw new Error(`Unknown TEACHER_GATE_PROVIDER ${provider}: use anthropic, openai, ollama or vllm.`);
  }
}
