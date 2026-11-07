// A minimal client for the Teacher Gate HTTP service, as a product backend would call it. In the
// demo the browser calls it directly through Vite's dev proxy, acting with a `product` token's
// identity headers. A real product makes these calls from its own backend, after signing the user
// in, and never lets the browser choose `X-Actor-Role`.
import type { BriefDraft, DecisionInput, FeedbackDraft, MappingDecisionInput, ReleaseRecord, SavedBrief, StudentFeedbackView, TeacherDraftView } from "@teacher-gate/core";
import type { BriefState } from "@teacher-gate/react";

/** Who the demo is acting as. */
export interface As {
  id: string;
  role: "teacher" | "student";
}

/** The demo's teacher. */
export const TEACHER: As = { id: "demo-teacher", role: "teacher" };

/** An error from the service, with its HTTP status and message. */
export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function call<T>(as: As, method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "x-actor-id": as.id, "x-actor-role": as.role };
  // A token is optional: the demo server runs with TEACHER_GATE_INSECURE_DEV=1.
  const token = import.meta.env.VITE_TEACHER_GATE_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`/v1${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text === "" ? undefined : JSON.parse(text);
  } catch {
    throw new ApiError(res.status, res.ok ? "The service returned something that is not JSON." : `The service is not reachable (HTTP ${res.status}). Is teacher-gate-server running on port 8787?`);
  }
  if (!res.ok) throw new ApiError(res.status, (parsed as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`);
  return parsed as T;
}

const enc = encodeURIComponent;

/** The service's routes, as used by the demo. */
export const api = {
  health: async (): Promise<{ ok: boolean; model: string }> => {
    const res = await fetch("/healthz");
    if (!res.ok) throw new ApiError(res.status, "The service is not reachable.");
    return res.json() as Promise<{ ok: boolean; model: string }>;
  },
  putActivity: (as: As, activity: { id: string }) => call<unknown>(as, "PUT", `/activities/${enc(activity.id)}`, activity),
  draft: (as: As, submission: unknown) => call<FeedbackDraft>(as, "POST", "/drafts", submission),
  getDraft: (as: As, id: string) => call<TeacherDraftView>(as, "GET", `/drafts/${enc(id)}`),
  decide: (as: As, id: string, input: DecisionInput) => call<unknown>(as, "POST", `/drafts/${enc(id)}/decisions`, input),
  release: (as: As, id: string) => call<ReleaseRecord>(as, "POST", `/drafts/${enc(id)}/release`),
  studentView: (as: As, submissionId: string) => call<StudentFeedbackView>(as, "GET", `/submissions/${enc(submissionId)}/student-view`),
  draftBrief: (as: As, classSet: unknown, misconceptions: unknown) => call<BriefDraft>(as, "POST", "/briefs", { classSet, misconceptions }),
  getBrief: (as: As, id: string) => call<BriefState>(as, "GET", `/briefs/${enc(id)}`),
  decideMapping: (as: As, id: string, input: MappingDecisionInput) => call<unknown>(as, "POST", `/briefs/${enc(id)}/decisions`, input),
  saveBrief: (as: As, id: string) => call<SavedBrief>(as, "POST", `/briefs/${enc(id)}/save`),
};
