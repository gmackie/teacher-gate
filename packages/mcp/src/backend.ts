// The two ways the MCP server reaches Teacher Gate, behind one interface. Both act as an agent:
// - `HttpBackend` calls a running teacher-gate-server with an `agent` token. The server forces such
//   requests onto role `agent` / channel `agent`, so it refuses decisions and releases on its own.
// - `InProcessBackend` wraps a TeacherGate and always passes the agent actor below.
// The interface itself has no method that decides, releases, saves a brief, changes preferences,
// puts activities or reads the student view, so no tool can be built on one.
import {
  draftMisconceptionBrief,
  getBrief,
  type Activity,
  type Actor,
  type BriefDraft,
  type FeedbackDraft,
  type MappingDecision,
  type Misconception,
  type Preferences,
  type SavedBrief,
  type TeacherDraftView,
  type TeacherGate,
} from "@teacher-gate/core";

/** The actor every in-process call uses. Agents can draft and read, never decide or release. */
export const AGENT_ACTOR: Actor = Object.freeze({ id: "mcp-agent", role: "agent", channel: "agent" });

/** A brief and the teacher's decisions on it so far, as `getBrief` returns it. */
export type BriefState = { draft: BriefDraft; decisions: MappingDecision[]; saved?: SavedBrief; open: string[] };

/** An error the backend reports, with a message safe to show the agent. */
export class BackendError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "BackendError";
  }
}

/** The review-safe operations the MCP tools are built on: drafting and reading only. */
export interface TeacherGateBackend {
  getActivity(activityId: string): Promise<Activity>;
  draftFeedback(submission: unknown): Promise<FeedbackDraft>;
  getDraft(draftId: string): Promise<TeacherDraftView>;
  listDrafts(filter: { activityId?: string; submissionId?: string }): Promise<FeedbackDraft[]>;
  draftMisconceptionBrief(classSet: unknown, catalog?: readonly Misconception[]): Promise<BriefDraft & { skippedResponses: number }>;
  getBrief(briefId: string): Promise<BriefState>;
  getPreferences(activityId: string): Promise<Preferences>;
}

/** Wraps a TeacherGate in this process, always acting as {@link AGENT_ACTOR}. */
export class InProcessBackend implements TeacherGateBackend {
  constructor(
    readonly gate: TeacherGate,
    /** The catalog a brief uses when the agent names none. */
    readonly misconceptions: readonly Misconception[] = [],
  ) {}
  getActivity(activityId: string) {
    return this.gate.getActivity(activityId);
  }
  draftFeedback(submission: unknown) {
    return this.gate.draftFeedback(AGENT_ACTOR, submission);
  }
  getDraft(draftId: string) {
    return this.gate.getDraft(AGENT_ACTOR, draftId);
  }
  listDrafts(filter: { activityId?: string; submissionId?: string }) {
    return this.gate.listDrafts(AGENT_ACTOR, filter);
  }
  draftMisconceptionBrief(classSet: unknown, catalog?: readonly Misconception[]) {
    return draftMisconceptionBrief(this.gate, AGENT_ACTOR, classSet, catalog ?? this.misconceptions);
  }
  getBrief(briefId: string) {
    return getBrief(this.gate, AGENT_ACTOR, briefId);
  }
  getPreferences(activityId: string) {
    return this.gate.preferencesFor(activityId);
  }
}

/** Options for {@link HttpBackend}. */
export interface HttpBackendOptions {
  /** The service's base URL, e.g. `http://localhost:8787` (the `/v1` prefix is added). */
  url: string;
  /** A token the service maps to kind `agent`. */
  agentToken: string;
  /** An agent id for the audit log; the service still forces role and channel to `agent`. */
  agentId?: string;
  fetch?: typeof fetch;
}

/** Calls a running teacher-gate-server with an agent token. */
export class HttpBackend implements TeacherGateBackend {
  readonly #o: HttpBackendOptions;
  readonly #base: string;
  constructor(options: HttpBackendOptions) {
    this.#o = options;
    this.#base = `${options.url.replace(/\/+$/, "")}/v1`;
  }

  async #call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { authorization: `Bearer ${this.#o.agentToken}`, accept: "application/json" };
    if (this.#o.agentId !== undefined) headers["x-actor-id"] = this.#o.agentId;
    if (body !== undefined) headers["content-type"] = "application/json";
    let res: Response;
    try {
      res = await (this.#o.fetch ?? fetch)(this.#base + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    } catch {
      throw new BackendError("unavailable", "The Teacher Gate service could not be reached.");
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new BackendError("http", `The Teacher Gate service answered ${res.status} without JSON.`);
    }
    if (!res.ok) {
      const e = json as { error?: unknown; message?: unknown };
      throw new BackendError(typeof e.error === "string" ? e.error : "http", typeof e.message === "string" ? e.message : `HTTP ${res.status}.`);
    }
    return json as T;
  }

  getActivity(activityId: string) {
    return this.#call<Activity>("GET", `/activities/${encodeURIComponent(activityId)}`);
  }
  draftFeedback(submission: unknown) {
    return this.#call<FeedbackDraft>("POST", "/drafts", submission);
  }
  getDraft(draftId: string) {
    return this.#call<TeacherDraftView>("GET", `/drafts/${encodeURIComponent(draftId)}`);
  }
  listDrafts(filter: { activityId?: string; submissionId?: string }) {
    const q = new URLSearchParams();
    if (filter.activityId) q.set("activityId", filter.activityId);
    if (filter.submissionId) q.set("submissionId", filter.submissionId);
    const qs = q.toString();
    return this.#call<FeedbackDraft[]>("GET", `/drafts${qs === "" ? "" : `?${qs}`}`);
  }
  draftMisconceptionBrief(classSet: unknown, catalog?: readonly Misconception[]) {
    return this.#call<BriefDraft & { skippedResponses: number }>("POST", "/briefs", { classSet, ...(catalog === undefined ? {} : { misconceptions: catalog }) });
  }
  getBrief(briefId: string) {
    return this.#call<BriefState>("GET", `/briefs/${encodeURIComponent(briefId)}`);
  }
  getPreferences(activityId: string) {
    return this.#call<Preferences>("GET", `/activities/${encodeURIComponent(activityId)}/preferences`);
  }
}
