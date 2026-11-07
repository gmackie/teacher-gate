// The Teacher Gate service: drafts AI feedback, records the teacher's decisions, and releases only
// what a teacher approved. The rules adapted from EducateOS (`@educateos/assessment-ai`,
// Apache-2.0) are:
// - Only a teacher acting directly (`channel: "direct"`) decides on or releases AI output. Agents
//   may draft and read, never decide.
// - Release is allowed only where the activity's AI-help policy is `releasable`, and is recorded
//   with who and when. The student view is built from that record alone.
// - Every action, allowed or denied, is audited by ID, never with student text.
import { randomBoundary } from "./boundary";
import { buildFeedbackContext, type ContextLimits } from "./context";
import type { ModelAdapter } from "./model";
import { noModeration, type Moderator } from "./moderation";
import { derivePreferences, type Preferences } from "./preferences";
import type { Actor, AppliedPreference, AuditRecord, DecisionRecord, FeedbackDraft, ReleaseRecord } from "./records";
import { Activity, Misconception, Submission, type Id } from "./schemas";
import { C, MemoryStore, type Store } from "./store";
import { extractJson, verifyFindings, type RangePolicy } from "./verify";
import { decisionsInForce, releaseBlockers, studentFeedbackView, teacherDraftView, type StudentFeedbackView, type TeacherDraftView } from "./views";
import { z } from "zod";

/** An error a caller can act on. `code` maps to an HTTP status in the service. */
export class GateError extends Error {
  constructor(
    readonly code: "forbidden" | "not-found" | "conflict" | "policy" | "validation" | "moderation",
    message: string,
  ) {
    super(message);
    this.name = "GateError";
  }
}

/** Parses untrusted input, throwing a `validation` {@link GateError}. */
export function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const r = schema.safeParse(value);
  if (!r.success) throw new GateError("validation", z.prettifyError(r.error).slice(0, 2000));
  return r.data;
}

/** What a {@link TeacherGate} is built from. */
export interface TeacherGateOptions {
  model: ModelAdapter;
  store?: Store;
  /** Moderation of student-facing text at release. Defaults to {@link noModeration}. */
  moderator?: Moderator;
  /** A misconception catalog; entries matching an activity's standards are added to its context. */
  misconceptions?: readonly Misconception[];
  limits?: Partial<ContextLimits>;
  rangePolicy?: RangePolicy;
  maxOutputTokens?: number;
  /** Retries after a model call throws. Default 1. */
  retries?: number;
  now?: () => Date;
  boundary?: () => string;
}

/** A teacher's decision on one finding. */
export const DecisionInput = z.discriminatedUnion("decision", [
  z.strictObject({ findingId: z.string().min(1).max(64), decision: z.literal("accept"), levelId: z.string().max(128).optional(), reason: z.string().max(1000).optional() }),
  z.strictObject({ findingId: z.string().min(1).max(64), decision: z.literal("reject"), reason: z.string().max(1000).optional() }),
  z.strictObject({ findingId: z.string().min(1).max(64), decision: z.literal("edit"), text: z.string().trim().min(1).max(2000), levelId: z.string().max(128).optional(), reason: z.string().max(1000).optional() }),
]);
export type DecisionInput = z.infer<typeof DecisionInput>;

/** The Teacher Gate service. See the module comment for its rules. */
export class TeacherGate {
  readonly store: Store;
  readonly model: ModelAdapter;
  readonly #o: TeacherGateOptions;
  readonly #moderator: Moderator;
  readonly #now: () => Date;

  constructor(options: TeacherGateOptions) {
    this.#o = options;
    this.model = options.model;
    this.store = options.store ?? new MemoryStore();
    this.#moderator = options.moderator ?? noModeration;
    this.#now = options.now ?? (() => new Date());
  }

  /** The current time as ISO 8601. */
  now(): string {
    return this.#now().toISOString();
  }

  // --- Access rules ---------------------------------------------------------------------------

  /** Records an audit entry. */
  async audit(action: string, actor: Actor, outcome: AuditRecord["outcome"], subject: Record<string, string>, reason?: string): Promise<void> {
    await this.store.appendAudit({ at: this.now(), action, actor, outcome, subject, ...(reason === undefined ? {} : { reason }) });
  }

  /** Throws `forbidden` (and audits the denial) unless the actor is a teacher acting directly. */
  async requireTeacherDirect(actor: Actor, action: string, subject: Record<string, string>): Promise<void> {
    if (actor.role !== "teacher" || actor.channel !== "direct") {
      const reason = "Only a teacher acting directly can do this; agents and services may draft and read, never decide or release.";
      await this.audit(action, actor, "denied", subject, reason);
      throw new GateError("forbidden", reason);
    }
  }

  /** Throws `forbidden` for students and unknown roles: drafting and reading teacher-side records. */
  async requireStaff(actor: Actor, action: string, subject: Record<string, string>): Promise<void> {
    if (actor.role === "student") {
      const reason = "Students cannot read or request AI drafts.";
      await this.audit(action, actor, "denied", subject, reason);
      throw new GateError("forbidden", reason);
    }
  }

  // --- Activities -----------------------------------------------------------------------------

  /** Creates or replaces an activity: its rubric, AI-help policy and guidance. Teacher, direct. */
  async putActivity(actor: Actor, raw: unknown): Promise<Activity> {
    const activity = parse(Activity, raw);
    await this.requireTeacherDirect(actor, "activity.put", { activityId: activity.id });
    await this.store.put(C.activities, activity.id, activity);
    await this.audit("activity.put", actor, "allowed", { activityId: activity.id });
    return activity;
  }

  /** One activity. */
  async getActivity(id: string): Promise<Activity> {
    const a = await this.store.get<Activity>(C.activities, id);
    if (a === undefined) throw new GateError("not-found", `Activity ${id} was not found.`);
    return a;
  }

  // --- Task 1: verifiable rubric feedback ------------------------------------------------------

  /** The preferences a new draft on an activity would apply, for the teacher to inspect (Task 3). */
  async preferencesFor(activityId: string): Promise<Preferences> {
    const activity = await this.getActivity(activityId);
    const criteria = activity.guidance?.criteria === undefined ? activity.rubric.criteria : activity.rubric.criteria.filter((c) => activity.guidance!.criteria!.includes(c.id));
    const decisions = await this.store.list<DecisionRecord>(C.decisions, (d) => d.activityId === activityId);
    const disabled = new Set((await this.store.get<string[]>(C.disabledPreferences, activityId)) ?? []);
    return derivePreferences(activity, criteria, decisions, { disabled });
  }

  /** Turns one preference on or off for an activity. Teacher, direct. */
  async setPreference(actor: Actor, activityId: string, preferenceId: string, enabled: boolean): Promise<AppliedPreference[]> {
    await this.requireTeacherDirect(actor, "preference.set", { activityId, preferenceId });
    await this.getActivity(activityId);
    const disabled = new Set((await this.store.get<string[]>(C.disabledPreferences, activityId)) ?? []);
    if (enabled) disabled.delete(preferenceId);
    else disabled.add(preferenceId);
    await this.store.put(C.disabledPreferences, activityId, [...disabled]);
    await this.audit("preference.set", actor, "allowed", { activityId, preferenceId, enabled: String(enabled) });
    return (await this.preferencesFor(activityId)).applied;
  }

  /**
   * Drafts AI feedback on a submission. Teachers, agents and services may draft; students may not.
   * A policy of `none`, empty or oversized work yields a `skipped` draft, never an error.
   */
  async draftFeedback(actor: Actor, raw: unknown): Promise<FeedbackDraft> {
    const submission = parse(Submission, raw);
    const subject = { submissionId: submission.id, activityId: submission.activityId };
    await this.requireStaff(actor, "draft.create", subject);
    const activity = await this.getActivity(submission.activityId);
    const preferences = await this.preferencesFor(activity.id);
    const built = buildFeedbackContext({
      activity,
      submission,
      boundary: (this.#o.boundary ?? randomBoundary)(),
      preferences,
      misconceptions: this.#o.misconceptions ?? [],
      ...(this.#o.limits === undefined ? {} : { limits: this.#o.limits }),
    });
    const base = {
      id: crypto.randomUUID(),
      kind: "feedback" as const,
      activityId: activity.id,
      submissionId: submission.id,
      learnerRef: submission.learnerRef,
      createdAt: this.now(),
      requestedBy: actor,
      model: this.model.label,
      findings: [],
      dropped: [],
      misplacedRanges: 0,
      appliedPreferences: preferences.applied,
    };
    let draft: FeedbackDraft;
    if (built.status === "skipped") {
      draft = { ...base, status: "skipped", skipReason: built.reason };
    } else {
      const response = await this.#complete(built.system, built.user);
      if (response === undefined) {
        draft = { ...base, status: "failed", context: built.report };
      } else {
        const verified = verifyFindings(extractJson(response.text), { activity, artifacts: built.artifacts, criteria: built.criteria }, this.#o.rangePolicy);
        draft = {
          ...base,
          status: verified.parsed ? "completed" : "invalid-output",
          findings: verified.findings,
          dropped: verified.dropped,
          misplacedRanges: verified.misplacedRanges,
          context: built.report,
          usage: response.usage,
        };
      }
    }
    await this.store.put(C.drafts, draft.id, draft);
    await this.audit("draft.create", actor, "allowed", { ...subject, draftId: draft.id, status: draft.status });
    return draft;
  }

  async #complete(system: string, user: string) {
    const attempts = 1 + (this.#o.retries ?? 1);
    for (let i = 0; i < attempts; i++) {
      try {
        return await this.model.complete({ system, user, maxOutputTokens: this.#o.maxOutputTokens ?? 2000, json: true, temperature: 0 });
      } catch {
        // Retried; the last failure leaves a `failed` draft.
      }
    }
    return undefined;
  }

  async #draft(id: string): Promise<FeedbackDraft> {
    const d = await this.store.get<FeedbackDraft>(C.drafts, id);
    if (d === undefined) throw new GateError("not-found", `Draft ${id} was not found.`);
    return d;
  }

  /** The teacher's view of a draft. Staff only. */
  async getDraft(actor: Actor, draftId: string): Promise<TeacherDraftView> {
    await this.requireStaff(actor, "draft.read", { draftId });
    const draft = await this.#draft(draftId);
    const activity = await this.getActivity(draft.activityId);
    const decisions = await this.store.list<DecisionRecord>(C.decisions, (d) => d.draftId === draftId);
    await this.audit("draft.read", actor, "allowed", { draftId });
    return teacherDraftView(activity, draft, decisions, await this.store.get<ReleaseRecord>(C.releases, draftId));
  }

  /** Drafts, optionally for one activity or submission. Staff only. */
  async listDrafts(actor: Actor, filter: { activityId?: string; submissionId?: string } = {}): Promise<FeedbackDraft[]> {
    await this.requireStaff(actor, "draft.list", {});
    return this.store.list<FeedbackDraft>(C.drafts, (d) => (filter.activityId === undefined || d.activityId === filter.activityId) && (filter.submissionId === undefined || d.submissionId === filter.submissionId));
  }

  /** Records a teacher's accept, edit or reject on one finding. Teacher, direct. Not allowed after release. */
  async decide(actor: Actor, draftId: string, raw: unknown): Promise<DecisionRecord> {
    const input = parse(DecisionInput, raw);
    const subject = { draftId, findingId: input.findingId };
    await this.requireTeacherDirect(actor, "finding.decide", subject);
    const draft = await this.#draft(draftId);
    if ((await this.store.get(C.releases, draftId)) !== undefined) throw new GateError("conflict", "This draft was already released; its decisions are final.");
    const finding = draft.findings.find((f) => f.id === input.findingId);
    if (finding === undefined) throw new GateError("not-found", `Draft ${draftId} has no finding ${input.findingId}.`);
    const activity = await this.getActivity(draft.activityId);
    const criterion = activity.rubric.criteria.find((c) => c.id === finding.criterionId);
    if (input.decision !== "reject" && input.levelId !== undefined && !criterion?.levels.some((l) => l.id === input.levelId)) {
      throw new GateError("validation", `Criterion ${finding.criterionId} has no level ${input.levelId}.`);
    }
    const record: DecisionRecord = {
      id: crypto.randomUUID(),
      draftId,
      activityId: draft.activityId,
      findingId: finding.id,
      criterionId: finding.criterionId,
      decision: input.decision,
      originalObservation: finding.observation,
      ...(input.decision === "edit" ? { editedObservation: input.text } : {}),
      ...(input.decision !== "reject" && input.levelId !== undefined ? { levelId: input.levelId } : {}),
      ...(input.reason === undefined ? {} : { reason: input.reason }),
      decidedBy: actor.id,
      decidedAt: this.now(),
    };
    await this.store.put(C.decisions, record.id, record);
    await this.audit("finding.decide", actor, "allowed", { ...subject, decision: input.decision });
    return record;
  }

  /**
   * Releases a draft to its student: the accepted findings in the model's words and the edited ones
   * in the teacher's, after moderation. Teacher, direct; only under a `releasable` policy; every
   * finding must be decided first. Idempotent.
   */
  async release(actor: Actor, draftId: string): Promise<ReleaseRecord> {
    await this.requireTeacherDirect(actor, "draft.release", { draftId });
    const existing = await this.store.get<ReleaseRecord>(C.releases, draftId);
    if (existing !== undefined) return existing;
    const draft = await this.#draft(draftId);
    // The policy in force now decides, not the one when the draft was made.
    const activity = await this.getActivity(draft.activityId);
    const inForce = decisionsInForce(await this.store.list<DecisionRecord>(C.decisions, (d) => d.draftId === draftId), draftId);
    const blockers = releaseBlockers(activity, draft, inForce);
    if (blockers.length > 0) {
      await this.audit("draft.release", actor, "denied", { draftId }, blockers.join(" "));
      throw new GateError(activity.aiHelp === "releasable" ? "conflict" : "policy", blockers.join(" "));
    }
    const findings = draft.findings.flatMap((f) => {
      const d = inForce.get(f.id)!;
      if (d.decision === "reject") return [];
      return [{
        findingId: f.id,
        criterionId: f.criterionId,
        criterionTitle: activity.rubric.criteria.find((c) => c.id === f.criterionId)?.title ?? f.criterionId,
        text: d.decision === "edit" ? d.editedObservation! : f.observation,
        excerpts: f.excerpts.map(({ artifactId, start, end, quote }) => ({ artifactId, start, end, quote })),
      }];
    });
    for (const f of findings) {
      let result;
      try {
        result = await this.#moderator.check(f.text, { audience: "student" });
      } catch {
        result = { allowed: false, categories: ["moderator-error"] };
      }
      if (!result.allowed) {
        const reason = `Moderation (${this.#moderator.name}) held finding ${f.findingId}: ${(result.categories ?? []).join(", ") || "flagged"}. Edit it or reject it.`;
        await this.audit("draft.release", actor, "denied", { draftId, findingId: f.findingId }, reason);
        throw new GateError("moderation", reason);
      }
    }
    const release: ReleaseRecord = {
      draftId,
      submissionId: draft.submissionId,
      activityId: draft.activityId,
      learnerRef: draft.learnerRef,
      releasedBy: actor.id,
      releasedAt: this.now(),
      findings,
      variants: [],
    };
    await this.store.put(C.releases, draftId, release);
    await this.audit("draft.release", actor, "allowed", { draftId, submissionId: draft.submissionId, moderator: this.#moderator.name });
    return release;
  }

  /**
   * What a student sees for a submission: the latest release's findings, and nothing else. A
   * student may read only their own (`actor.id` must be the submission's `learnerRef`); staff may
   * preview it.
   */
  async studentView(actor: Actor, submissionId: Id, prefer?: { language?: string; readingLevel?: number }): Promise<StudentFeedbackView> {
    const releases = (await this.store.list<ReleaseRecord>(C.releases, (r) => r.submissionId === submissionId)).sort((a, b) => a.releasedAt.localeCompare(b.releasedAt));
    const latest = releases.at(-1);
    if (actor.role === "student" && latest !== undefined && latest.learnerRef !== actor.id) {
      await this.audit("student.view", actor, "denied", { submissionId }, "not the submission's student");
      throw new GateError("forbidden", "Students can read only their own feedback.");
    }
    if (actor.role === "student" && latest === undefined) {
      // No release: nothing to see, and no hint whether a draft exists.
      return { view: "student", submissionId, findings: [] };
    }
    // Feedback released under a policy since tightened is withdrawn from view.
    const activity = latest === undefined ? undefined : await this.store.get<Activity>(C.activities, latest.activityId);
    const visible = activity?.aiHelp === "releasable" ? latest : undefined;
    await this.audit("student.view", actor, "allowed", { submissionId });
    return studentFeedbackView(submissionId, visible, prefer);
  }

  /** The audit log. Staff only. */
  async auditLog(actor: Actor, filter?: (r: AuditRecord) => boolean): Promise<AuditRecord[]> {
    await this.requireStaff(actor, "audit.read", {});
    return this.store.audit(filter);
  }
}
