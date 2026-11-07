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

/** Who a finding's `observation` is written to. */
export type FeedbackVoice = "student" | "teacher";

const JSON_SHAPE = {
  student: 'Return only JSON: {"findings":[{"criterionId":"<criterion id>","observation":"<to the student, as \\"you\\": what the quoted words show, then one concrete next step>","rationale":"<optional, for the teacher only>","suggestedLevel":"<level id, optional>","excerpts":[{"artifact":"<artifact id>","quote":"<exact text from the work>"}],"uncertainty":"low|medium|high"}]}',
  teacher: 'Return only JSON: {"findings":[{"criterionId":"<criterion id>","observation":"<one or two sentences>","suggestedLevel":"<level id, optional>","excerpts":[{"artifact":"<artifact id>","quote":"<exact text from the work>"}],"uncertainty":"low|medium|high"}]}',
};

const EVIDENCE_RULE = "Quote short spans (a phrase or a sentence). Never paraphrase inside a quote, never fix the student's spelling in a quote, and never quote text that is not in the work: findings with quotes not found in the work are discarded.";

/**
 * The instructions a feedback request starts with, for findings written to the student (the
 * default) or to the teacher (the wording of the first evaluation round). Student work never
 * appears in them.
 */
export function feedbackInstructions(voice: FeedbackVoice = "student"): string {
  const lines = voice === "student"
    ? [
        "You draft formative feedback on one student's work, against the teacher's rubric. The teacher reviews every suggestion; nothing you write reaches the student unless the teacher approves it.",
        UNTRUSTED_NOTICE,
        `Write findings only for the rubric criteria listed. Write each finding's observation to the student, addressing them as "you": in one sentence say what the quoted words show, then give one concrete next step the student can take in a revision, tied to the quoted words. Put anything meant only for the teacher (for example why you suggest a level) in the optional rationale; the student never sees it. Each finding cites evidence: one or more excerpts quoted exactly, character for character, from the work. ${EVIDENCE_RULE}`,
      ]
    : [
        "You draft formative feedback for a teacher on one student's work, against the teacher's rubric. The teacher reviews every suggestion; nothing you write reaches the student unless the teacher approves it.",
        UNTRUSTED_NOTICE,
        `Write findings only for the rubric criteria listed. Each finding makes one specific observation a teacher could act on, and cites evidence: one or more excerpts quoted exactly, character for character, from the work. ${EVIDENCE_RULE}`,
      ];
  return [
    ...lines,
    "You may suggest the rubric level the evidence points to, using a level id from the rubric. Do not give points, scores, grades or approvals.",
    "State your uncertainty for each finding: low, medium or high.",
    JSON_SHAPE[voice],
  ].join("\n");
}

/** The default instructions: findings addressed to the student, each with one next step. */
export const FEEDBACK_INSTRUCTIONS = feedbackInstructions("student");

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
  | {
      status: "ok";
      system: string;
      user: string;
      /** The criteria the model was asked about: the teacher's selection less any held back. */
      criteria: Criterion[];
      /** Selected criteria held back because the teacher keeps rejecting suggestions on them. */
      heldBack: string[];
      artifacts: Artifact[];
      report: ContextReport;
    }
  | { status: "skipped"; reason: SkipReason; criteria: Criterion[] };

/** Builds the prompt for a feedback draft (Task 1). */
export function buildFeedbackContext(input: {
  activity: Activity;
  submission: Submission;
  boundary: string;
  preferences?: Preferences;
  misconceptions?: readonly Misconception[];
  limits?: Partial<ContextLimits>;
  /** Replaces the opening instructions. Defaults to {@link FEEDBACK_INSTRUCTIONS}. */
  instructions?: string;
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
  // Learned preferences are enforced here, not left to the model: a criterion the teacher keeps
  // rejecting is left out of the rubric the model sees (and findings on it are dropped on
  // verification). Telling a model "comment on X only on strong evidence" can be read backwards.
  const heldBack = criteria.filter((c) => prefs?.deprioritized.includes(c.id)).map((c) => c.id);
  const asked = criteria.filter((c) => !heldBack.includes(c.id));
  const misconceptions = relevantMisconceptions(activity, input.misconceptions ?? [], limits.maxMisconceptions);
  const rubric = asked.map((c) => ({
    id: c.id,
    title: c.title,
    ...(c.description === undefined ? {} : { description: c.description }),
    levels: c.levels.map((l) => ({ id: l.id, label: l.label, ...(l.description === undefined ? {} : { description: l.description }) })),
  }));
  const parts = [input.instructions ?? FEEDBACK_INSTRUCTIONS, "", `Activity: ${JSON.stringify(activity.title)}`];
  if (activity.prompt !== undefined) parts.push(`What students were asked to do: ${JSON.stringify(activity.prompt)}`);
  if (activity.objectives?.length) parts.push(`Learning objectives: ${JSON.stringify(activity.objectives)}`);
  parts.push(`Rubric criteria: ${JSON.stringify(rubric)}`);
  if (misconceptions.length > 0) {
    parts.push(`Known misconceptions for this activity (name one in an observation only if the quoted evidence shows it): ${JSON.stringify(misconceptions.map((m) => ({ id: m.id, title: m.title, description: m.description })))}`);
  }
  if (activity.guidance?.instructions !== undefined && prefs?.applied.some((p) => p.id === "guidance:instructions") !== false) {
    parts.push(`The teacher's instructions: ${JSON.stringify(activity.guidance.instructions)}`);
  }
  const examples = prefs?.editExamples.filter((e) => !heldBack.includes(e.criterionId)) ?? [];
  if (examples.length > 0) {
    parts.push(`How this teacher rewrote earlier suggestions (match their style): ${JSON.stringify(examples.map((e) => ({ criterionId: e.criterionId, suggested: e.before, teacherWrote: e.after })))}`);
  }
  const system = parts.join("\n");
  const user = `The work to assess:\n${wrapUntrusted({ artifacts: artifacts.map((a) => ({ artifact: a.id, ...(a.label === undefined ? {} : { label: a.label }), text: a.text })) }, input.boundary)}`;
  return {
    status: "ok",
    system,
    user,
    criteria: asked,
    heldBack,
    artifacts,
    report: { criteria: asked.map((c) => c.id), objectives: activity.objectives?.length ?? 0, misconceptions: misconceptions.map((m) => m.id), instructionChars: system.length, workChars },
  };
}
