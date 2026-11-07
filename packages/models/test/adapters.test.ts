import { describe, expect, it } from "vitest";
import { ScriptedModel } from "@teacher-gate/core/testing";
import { MeteredModel, modelFromEnv, OllamaModel, OpenAICompatibleModel, SpendCapReached } from "../src";

function fakeFetch(reply: unknown, seen: { url?: string; body?: unknown; headers?: unknown }) {
  return (async (url: string, init: RequestInit) => {
    seen.url = url;
    seen.body = JSON.parse(String(init.body));
    seen.headers = init.headers;
    return new Response(JSON.stringify(reply), { status: 200 });
  }) as unknown as typeof fetch;
}
const req = { system: "S", user: "U", maxOutputTokens: 100, json: true };

describe("adapters", () => {
  it("speaks OpenAI-compatible chat completions with JSON mode and a bearer key", async () => {
    const seen: { url?: string; body?: any; headers?: any } = {};
    const m = new OpenAICompatibleModel({ baseUrl: "http://x/v1/", model: "m", apiKey: "k", fetch: fakeFetch({ choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: 3, completion_tokens: 1 } }, seen) });
    const r = await m.complete(req);
    expect(seen.url).toBe("http://x/v1/chat/completions");
    expect(seen.body).toMatchObject({ model: "m", temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "system", content: "S" }, { role: "user", content: "U" }] });
    expect(seen.headers).toMatchObject({ authorization: "Bearer k" });
    expect(r).toEqual({ text: "{}", model: "m", usage: { inputTokens: 3, outputTokens: 1 } });
  });

  it("speaks Ollama's chat API with JSON format and a fixed seed", async () => {
    const seen: { body?: any } = {};
    const m = new OllamaModel({ model: "qwen2.5:7b", fetch: fakeFetch({ message: { content: "{}" }, prompt_eval_count: 5, eval_count: 2 }, seen) });
    const r = await m.complete(req);
    expect(seen.body).toMatchObject({ format: "json", stream: false, options: { temperature: 0, seed: 42 } });
    expect(r.usage).toEqual({ inputTokens: 5, outputTokens: 2 });
    expect(m.label).toBe("ollama/qwen2.5:7b");
  });

  it("picks a provider from the environment", () => {
    expect(modelFromEnv({ TEACHER_GATE_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "x" }).label).toBe("anthropic/claude-haiku-5-5");
    expect(modelFromEnv({}).label).toBe("ollama/qwen2.5:7b");
    expect(modelFromEnv({ TEACHER_GATE_PROVIDER: "", TEACHER_GATE_MODEL: "" }).label).toBe("ollama/qwen2.5:7b");
    expect(modelFromEnv({ TEACHER_GATE_PROVIDER: "vllm", TEACHER_GATE_MODEL: "m" }).label).toBe("vllm/m");
    expect(() => modelFromEnv({ TEACHER_GATE_PROVIDER: "nope" })).toThrow();
  });

  it("meters spend and refuses past the cap, and refuses unpriced models under a cap", async () => {
    const inner = new ScriptedModel(() => "x".repeat(4000), "anthropic/claude-sonnet-5-5");
    const m = new MeteredModel(inner, 0.02);
    await m.complete({ ...req, user: "y".repeat(4000) });
    expect(m.spentUsd).toBeCloseTo((1001 * 2 + 1000 * 10) / 1e6, 8);
    m.spentUsd = 0.02;
    await expect(m.complete(req)).rejects.toBeInstanceOf(SpendCapReached);
    await expect(new MeteredModel(new ScriptedModel(["{}"], "openai/unknown"), 1).complete(req)).rejects.toThrow(/No price/);
  });
});
