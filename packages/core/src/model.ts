// The model port: the one interface every model adapter implements. Teacher Gate never imports a
// provider SDK; adapters live in `@teacher-gate/models` and anyone can write another.

/** Tokens a request used, as the provider reported them. */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * One request. `system` holds Teacher Gate's instructions, the rubric and the teacher's own
 * guidance; it never contains student work. `user` holds the student's work inside an
 * untrusted-content boundary (see `wrapUntrusted`).
 */
export interface ModelRequest {
  system: string;
  user: string;
  maxOutputTokens: number;
  /** Ask for a JSON object where the provider supports it. Output is still parsed and verified. */
  json: boolean;
  /**
   * A JSON Schema the output must match, for providers with structured output. Adapters without
   * support ignore it; output is still parsed and checked by the caller.
   */
  jsonSchema?: Record<string, unknown>;
  /** Sampling temperature. Adapters default to 0 for reproducible evaluation. */
  temperature?: number;
  /** Optional seed, for providers that support one. */
  seed?: number;
}

/** What the model returned. `text` is untrusted until parsed and verified. */
export interface ModelResponse {
  text: string;
  usage: TokenUsage;
  /** The provider's own model identifier, as it reported it. */
  model: string;
}

/** A language model behind an adapter. Throwing means the request failed and may be retried. */
export interface ModelAdapter {
  /** A label shown to teachers and in audit records, e.g. `anthropic/claude-haiku-5-5`. */
  readonly label: string;
  complete(request: ModelRequest): Promise<ModelResponse>;
}
