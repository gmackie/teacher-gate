// View models: pure functions from records to plain data, with no I/O. The student view is built
// from the release snapshot alone, by construction, so it cannot show anything the teacher did not
// approve. `findLeaks` checks that independently, for tests and the evaluation suite.
import type { DecisionRecord, FeedbackDraft, ReleaseRecord } from "./records";
import type { Activity, Criterion } from "./schemas";
import type { Finding } from "./verify";

/** The notice shown beside AI-drafted feedback. */
export const AI_NOTICE = "Drafted with AI and reviewed by your teacher.";
/** The notice shown beside a machine translation or reading-level rewrite. */
export const VARIANT_NOTICE = "Your teacher's feedback, rewritten by AI for reading level or language and approved by your teacher.";

const SCORE_PATTERNS = [
  /\b(score|scored|grade|graded|points?|marks?)\b[^.]{0,20}\d/i,
  /\b\d+(\.\d+)?\s*(\/|out of)\s*\d+\b/i,
  /\b\d+(\.\d+)?\s*%/,
  /\b(an?|the)\s+[A-F][+-]?\b(?=\s|[.,;]|$)/,
];

/**
 * Whether text states a grade, a score or a rubric level: a numeric score, or a level's label next
 * to the word "level" (e.g. "this is at the Developing level"). Such text must be edited by the
 * teacher before it can be released.
 */
export function gradeLanguage(text: string, criterion: Criterion | undefined): string[] {
  const hits: string[] = [];
  for (const p of SCORE_PATTERNS) if (p.test(text)) hits.push("score");
  for (const level of criterion?.levels ?? []) {
    const label = level.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${label}\\b\\s+(level|band|range)\\b|\\blevel\\s*(of\\s+)?["“']?${label}\\b|\\blevel\\s+${level.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) {
      hits.push(`level:${level.id}`);
    }
  }
  return [...new Set(hits)];
}

/** The decision in force on each finding of a draft: the latest recorded. */
export function decisionsInForce(decisions: readonly DecisionRecord[], draftId: string): Map<string, DecisionRecord> {
  const m = new Map<string, DecisionRecord>();
  for (const d of [...decisions].filter((x) => x.draftId === draftId).sort((a, b) => a.decidedAt.localeCompare(b.decidedAt))) m.set(d.findingId, d);
  return m;
}

/** One finding as the teacher sees it. */
export interface TeacherFindingView extends Finding {
  criterionTitle: string;
  suggestedLevelLabel?: string;
  decision?: { decision: DecisionRecord["decision"]; text?: string; levelId?: string; reason?: string; decidedBy: string; decidedAt: string };
  /** Present when the model's text states a grade or level; the teacher must edit it before release. */
  gradeLanguage?: string[];
}

/** The teacher's view of a draft. */
export interface TeacherDraftView {
  view: "teacher";
  draft: Omit<FeedbackDraft, "findings">;
  findings: TeacherFindingView[];
  /** Counts of dropped findings by reason; their content is never kept. */
  droppedByReason: Record<string, number>;
  released: boolean;
  /** Why release is not possible yet, if it is not. */
  releaseBlockers: string[];
  notice: string;
}

/** Why a draft cannot be released, given its decisions; empty when it can. */
export function releaseBlockers(activity: Activity, draft: FeedbackDraft, decisions: ReadonlyMap<string, DecisionRecord>): string[] {
  const blockers: string[] = [];
  if (activity.aiHelp !== "releasable") blockers.push(`This activity's AI help policy is "${activity.aiHelp}", so AI feedback cannot be released to students.`);
  if (draft.status !== "completed") blockers.push("This draft has no findings to release.");
  const undecided = draft.findings.filter((f) => !decisions.has(f.id));
  if (undecided.length > 0) blockers.push(`Decide on every finding first (${undecided.map((f) => f.id).join(", ")} open).`);
  if (draft.status === "completed" && undecided.length === 0 && ![...decisions.values()].some((d) => d.decision !== "reject")) blockers.push("Every finding was rejected; there is nothing to release.");
  for (const f of draft.findings) {
    const d = decisions.get(f.id);
    if (d?.decision === "accept") {
      const hits = gradeLanguage(f.observation, activity.rubric.criteria.find((c) => c.id === f.criterionId));
      if (hits.length > 0) blockers.push(`Finding ${f.id} states a grade or level; edit it before release.`);
    }
  }
  return blockers;
}

/** The teacher's view of a draft: findings with evidence, uncertainty, decisions and what is still open. */
export function teacherDraftView(activity: Activity, draft: FeedbackDraft, decisions: readonly DecisionRecord[], release: ReleaseRecord | undefined): TeacherDraftView {
  const inForce = decisionsInForce(decisions, draft.id);
  const { findings, ...rest } = draft;
  const droppedByReason: Record<string, number> = {};
  for (const d of draft.dropped) droppedByReason[d.reason] = (droppedByReason[d.reason] ?? 0) + 1;
  return {
    view: "teacher",
    draft: rest,
    findings: findings.map((f) => {
      const criterion = activity.rubric.criteria.find((c) => c.id === f.criterionId);
      const d = inForce.get(f.id);
      const hits = gradeLanguage(f.observation, criterion);
      return {
        ...f,
        criterionTitle: criterion?.title ?? f.criterionId,
        ...(f.suggestedLevelId === undefined ? {} : { suggestedLevelLabel: criterion?.levels.find((l) => l.id === f.suggestedLevelId)?.label ?? f.suggestedLevelId }),
        ...(d === undefined ? {} : { decision: { decision: d.decision, ...(d.editedObservation === undefined ? {} : { text: d.editedObservation }), ...(d.levelId === undefined ? {} : { levelId: d.levelId }), ...(d.reason === undefined ? {} : { reason: d.reason }), decidedBy: d.decidedBy, decidedAt: d.decidedAt } }),
        ...(hits.length === 0 ? {} : { gradeLanguage: hits }),
      };
    }),
    droppedByReason,
    released: release !== undefined,
    releaseBlockers: release === undefined ? releaseBlockers(activity, draft, inForce) : [],
    notice: "AI-suggested feedback for you to review. It is not a grade, and no student sees it until you release it.",
  };
}

/** The student's view of their feedback: released findings in the teacher's words, and nothing else. */
export interface StudentFeedbackView {
  view: "student";
  submissionId: string;
  findings: { criterion: string; text: string; evidence: { artifactId: string; start: number; end: number; quote: string }[] }[];
  notice?: string;
  /** Present when the text shown is an approved language or reading-level variant. */
  variant?: { language?: string; readingLevel?: number; notice: string };
}

/**
 * The student view of one submission: built only from a release snapshot. Without a release it is
 * empty. With `prefer`, an approved variant in that language (or at that reading level) is shown.
 */
export function studentFeedbackView(submissionId: string, release: ReleaseRecord | undefined, prefer?: { language?: string; readingLevel?: number }): StudentFeedbackView {
  if (release === undefined) return { view: "student", submissionId, findings: [] };
  const variant = prefer === undefined
    ? undefined
    : release.variants.find((v) => v.approvedAt !== undefined && (prefer.language === undefined || v.language === prefer.language) && (prefer.readingLevel === undefined || v.readingLevel === prefer.readingLevel));
  return {
    view: "student",
    submissionId,
    findings: release.findings.map((f) => ({
      criterion: f.criterionTitle,
      text: variant?.findings.find((v) => v.findingId === f.findingId)?.text ?? f.text,
      evidence: f.excerpts.map((e) => ({ artifactId: e.artifactId, start: e.start, end: e.end, quote: e.quote })),
    })),
    notice: AI_NOTICE,
    ...(variant === undefined ? {} : { variant: { ...(variant.language === undefined ? {} : { language: variant.language }), ...(variant.readingLevel === undefined ? {} : { readingLevel: variant.readingLevel }), notice: VARIANT_NOTICE } }),
  };
}

/** One leak found in a student view. */
export interface Leak {
  kind: "grade-field" | "level" | "rejected-finding" | "rejected-criterion" | "unreleased" | "teacher-only-field";
  detail: string;
}

const FORBIDDEN_KEYS = new Set(["suggestedLevelId", "suggestedLevelLabel", "levelId", "level", "points", "score", "grade", "uncertainty", "model", "reason", "dropped", "decision"]);

function keysOf(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const v of value) keysOf(v, out);
  else if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      keysOf(v, out);
    }
  }
  return out;
}

/**
 * Checks a student-facing payload for leaks, independently of how it was built: grade or
 * teacher-only fields, level labels next to "level", score language, text from rejected findings,
 * criteria every finding on which the teacher rejected, and any finding never released.
 */
export function findLeaks(view: unknown, input: { activity: Activity; draft: FeedbackDraft; decisions: readonly DecisionRecord[]; release?: ReleaseRecord }): Leak[] {
  const leaks: Leak[] = [];
  for (const k of keysOf(view)) if (FORBIDDEN_KEYS.has(k)) leaks.push({ kind: k === "uncertainty" || k === "model" || k === "reason" || k === "dropped" || k === "decision" ? "teacher-only-field" : "grade-field", detail: k });
  const text = JSON.stringify(view);
  const inForce = decisionsInForce(input.decisions, input.draft.id);
  const releasedIds = new Set(input.release?.findings.map((f) => f.findingId) ?? []);
  for (const f of input.draft.findings) {
    const d = inForce.get(f.id);
    if (d?.decision === "reject" && text.includes(f.observation)) leaks.push({ kind: "rejected-finding", detail: f.id });
    if (d?.decision !== "reject" && !releasedIds.has(f.id) && text.includes(f.observation)) leaks.push({ kind: "unreleased", detail: f.id });
  }
  for (const c of input.activity.rubric.criteria) {
    const onIt = input.draft.findings.filter((f) => f.criterionId === c.id);
    if (onIt.length > 0 && onIt.every((f) => inForce.get(f.id)?.decision === "reject") && text.includes(JSON.stringify(c.title))) leaks.push({ kind: "rejected-criterion", detail: c.id });
  }
  const shown = (view as Partial<StudentFeedbackView>).findings ?? [];
  for (const f of shown) {
    for (const hit of gradeLanguage(f.text ?? "", input.activity.rubric.criteria.find((c) => c.title === f.criterion))) leaks.push({ kind: "level", detail: hit });
  }
  return leaks;
}
