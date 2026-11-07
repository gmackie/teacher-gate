// Test doubles. A scripted model returns canned outputs so the harness can be tested without a
// provider, and records what it was sent so tests can check the prompt.
import type { ModelAdapter, ModelRequest, ModelResponse } from "./model";

/** A model that answers from a script: a fixed list of replies, or a function of the request. */
export class ScriptedModel implements ModelAdapter {
  readonly requests: ModelRequest[] = [];
  #i = 0;
  constructor(
    readonly script: readonly (string | Error)[] | ((request: ModelRequest) => string | Promise<string>),
    readonly label = "scripted/test",
  ) {}
  async complete(request: ModelRequest): Promise<ModelResponse> {
    this.requests.push(request);
    let reply: string | Error;
    if (typeof this.script === "function") reply = await this.script(request);
    else reply = this.script[Math.min(this.#i++, this.script.length - 1)] ?? "";
    if (reply instanceof Error) throw reply;
    return { text: reply, usage: { inputTokens: Math.ceil((request.system.length + request.user.length) / 4), outputTokens: Math.ceil(reply.length / 4) }, model: this.label };
  }
}

/** The JSON a model would put inside the untrusted boundary, parsed back out of a request. */
export function untrustedPayload(request: ModelRequest): unknown {
  const m = /<untrusted-content boundary="([0-9a-f]+)">\n([\s\S]*)\n<\/untrusted-content boundary="\1">/.exec(request.user);
  return m === null ? undefined : JSON.parse(m[2]!);
}
