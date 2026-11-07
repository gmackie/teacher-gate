// The context builder. It assembles only what the task needs: the selected rubric criteria, the
// activity's objectives, the teacher's instructions and preferences, and misconception entries
// that match the activity's standards. Student work goes only inside the untrusted boundary. Work
// over the size limit is skipped, never truncated, so a teacher never reviews feedback on half a
// submission.
import { UNTRUSTED_NOTICE, wrapUntrusted } from "./boundary";
import type { Preferences } from "./preferences";
import type { ContextReport, SkipReason } from "./records";
import type { Activity, Artifact, Criterion, Misconception, Submission } from "./schemas";

/** Size limits on context. */
export interface ContextLimits {
  /** The most characters of student work sent; more is skipped. Default 40,000. */
  maxWorkChars: number;
  /** The most misconception entries included. Default 8. */
  maxMisconceptions: number;
}

export const DEFAULT_LIMITS: ContextLimits = { maxWorkChars: 40_000, maxMisconceptions: 8 };

/** The instructions every feedback request starts with. Student work never appears in them. */
export const FEEDBACK_INSTRUCTIONS = [
  "You draft formative feedback for a teacher on one student's work, against the teacher's rubric. The teacher reviews every suggestion; nothing you write reaches the student unless the teacher approves it.",
  UNTRUSTED_NOTICE,
  "Write findings only for the rubric criteria listed. Each finding makes one specific observation a teacher could act on, and cites evidence: one or more excerpts quoted exactly, character for character, from the work. Quote short spans (a phrase or a sentence). Never paraphrase inside a quote, never fix the student's spelling in a quote, and never quote text that is not in the work: findings with quotes not found in the work are discarded.",
  "You may suggest the rubric level the evidence points to, using a level id from the rubric. Do not give points, scores, grades or approvals.",
  "State your uncertainty for each finding: low, medium or high.",
  'Return only JSON: {"findings":[{"criterionId":"<criterion id>","observation":"<one or two sentences>","suggestedLevel":"<level id, optional>","excerpts":[{"artifact":"<artifact id>","quote":"<exact text from the work>"}],"uncertainty":"low|medium|high"}]}',
].join("\n");

/** The criteria a draft addresses: the teacher's selection, or the whole rubric. */
export function selectedCriteria(activity: Activity): Criterion[] {
  const ids = activity.guidance?.criteria;
  return ids === undefined ? activity.rubric.criteria : activity.rubric.criteria.filter((c) => ids.includes(c.id));
}

/** Misconception entries relevant to the activity: those sharing a standard with it, at most `max`. */
export function relevantMisconceptions(activity: Activity, catalog: readonly Misconception[], max: number): Misconception[] {
  const standards = new Set(activity.standards ?? []);
  if (standards.size === 0) return [];
  return catalog.filter((m) => (m.standards ?? []).some((s) => standards.has(s))).slice(0, max);
}

/** A built prompt, or why none was built. */
export type BuiltContext =
  | { status: "ok"; system: string; user: string; criteria: Criterion[]; artifacts: Artifact[]; report: ContextReport }
  | { status: "skipped"; reason: SkipReason; criteria: Criterion[] };

/** Builds the prompt for a feedback draft (Task 1). */
export function buildFeedbackContext(input: {
  activity: Activity;
  submission: Submission;
  boundary: string;
  preferences?: Preferences;
  misconceptions?: readonly Misconception[];
  limits?: Partial<ContextLimits>;
}): BuiltContext {
  const limits = { ...DEFAULT_LIMITS, ...input.limits };
  const { activity, submission } = input;
  const criteria = selectedCriteria(activity);
  if (activity.aiHelp === "none") return { status: "skipped", reason: "ai-help-policy", criteria };
  const artifacts = submission.artifacts;
  if (artifacts.every((a) => a.text.trim() === "")) return { status: "skipped", reason: "no-text", criteria };
  const workChars = artifacts.reduce((n, a) => n + a.text.length, 0);
  if (workChars > limits.maxWorkChars) return { status: "skipped", reason: "input-too-large", criteria };

  const prefs = input.preferences;
  const misconceptions = relevantMisconceptions(activity, input.misconceptions ?? [], limits.maxMisconceptions);
  const rubric = criteria.map((c) => ({
    id: c.id,
    title: c.title,
    ...(c.description === undefined ? {} : { description: c.description }),
    levels: c.levels.map((l) => ({ id: l.id, label: l.label, ...(l.description === undefined ? {} : { description: l.description }) })),
  }));
  const parts = [FEEDBACK_INSTRUCTIONS, "", `Activity: ${JSON.stringify(activity.title)}`];
  if (activity.prompt !== undefined) parts.push(`What students were asked to do: ${JSON.stringify(activity.prompt)}`);
  if (activity.objectives?.length) parts.push(`Learning objectives: ${JSON.stringify(activity.objectives)}`);
  parts.push(`Rubric criteria: ${JSON.stringify(rubric)}`);
  if (misconceptions.length > 0) {
    parts.push(`Known misconceptions for this activity (name one in an observation only if the quoted evidence shows it): ${JSON.stringify(misconceptions.map((m) => ({ id: m.id, title: m.title, description: m.description })))}`);
  }
  if (activity.guidance?.instructions !== undefined && prefs?.applied.some((p) => p.id === "guidance:instructions") !== false) {
    parts.push(`The teacher's instructions: ${JSON.stringify(activity.guidance.instructions)}`);
  }
  if (prefs !== undefined && prefs.deprioritized.length > 0) {
    parts.push(`The teacher usually rejects suggestions on these criteria; comment on them only when the evidence is strong: ${JSON.stringify(prefs.deprioritized)}`);
  }
  if (prefs !== undefined && prefs.editExamples.length > 0) {
    parts.push(`How this teacher rewrote earlier suggestions (match their style): ${JSON.stringify(prefs.editExamples.map((e) => ({ criterionId: e.criterionId, suggested: e.before, teacherWrote: e.after })))}`);
  }
  const system = parts.join("\n");
  const user = `The work to assess:\n${wrapUntrusted({ artifacts: artifacts.map((a) => ({ artifact: a.id, ...(a.label === undefined ? {} : { label: a.label }), text: a.text })) }, input.boundary)}`;
  return {
    status: "ok",
    system,
    user,
    criteria,
    artifacts,
    report: { criteria: criteria.map((c) => c.id), objectives: activity.objectives?.length ?? 0, misconceptions: misconceptions.map((m) => m.id), instructionChars: system.length, workChars },
  };
}
