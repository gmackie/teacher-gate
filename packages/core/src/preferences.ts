// Task 3: teacher guidance and past decisions steer later drafts. Every preference applied to a
// draft is listed on it, so the teacher can see what is shaping the model's output and turn any of
// it off.
import type { AppliedPreference, DecisionRecord } from "./records";
import type { Activity, Criterion } from "./schemas";

/** An example of the teacher's own rewording of a model's observation. */
export interface EditExample {
  decisionId: string;
  criterionId: string;
  before: string;
  after: string;
}

/** The preferences in force for a draft, and the record of each one. */
export interface Preferences {
  applied: AppliedPreference[];
  /**
   * Criteria the teacher rejects most of the time. Enforced in code: they are left out of the
   * rubric the model sees, and any finding on them is dropped (`deprioritized-criterion`).
   */
  deprioritized: string[];
  editExamples: EditExample[];
}

/** Tuning for {@link derivePreferences}. */
export interface PreferenceOptions {
  /** The fewest decisions on a criterion before its rejection rate counts. Default 3. */
  minDecisions?: number;
  /** The rejection rate at which a criterion is deprioritized. Default 0.6. */
  rejectionRate?: number;
  /** The most edit examples included. Default 3. */
  maxExamples?: number;
  /** Preference IDs the teacher turned off. */
  disabled?: ReadonlySet<string>;
}

/**
 * Derives the preferences for a new draft on `activity` from its guidance and the teacher's past
 * decisions (latest first wins). Pure: the same inputs always give the same preferences.
 */
export function derivePreferences(activity: Activity, criteria: readonly Criterion[], decisions: readonly DecisionRecord[], options: PreferenceOptions = {}): Preferences {
  const minDecisions = options.minDecisions ?? 3;
  const rejectionRate = options.rejectionRate ?? 0.6;
  const maxExamples = options.maxExamples ?? 3;
  const disabled = options.disabled ?? new Set<string>();
  const applied: AppliedPreference[] = [];
  const guidance = activity.guidance;
  const on = (p: AppliedPreference) => {
    if (!disabled.has(p.id)) applied.push(p);
    return !disabled.has(p.id);
  };

  if (guidance?.criteria !== undefined) {
    on({ id: "guidance:criteria", kind: "focus-criteria", source: "guidance", description: `Feedback addresses only: ${criteria.map((c) => c.title).join(", ")}.` });
  }
  if (guidance?.instructions !== undefined) {
    on({ id: "guidance:instructions", kind: "instructions", source: "guidance", description: "Your written instructions for this activity." });
  }
  const deprioritized: string[] = [];
  const editExamples: EditExample[] = [];
  if (guidance?.learnFromDecisions !== false) {
    // The decision in force per finding is the latest one.
    const latest = new Map<string, DecisionRecord>();
    for (const d of decisions) latest.set(`${d.draftId}/${d.findingId}`, d);
    const inForce = [...latest.values()];
    const candidates: { criterion: Criterion; rejected: number; total: number }[] = [];
    for (const criterion of criteria) {
      const mine = inForce.filter((d) => d.criterionId === criterion.id);
      const rejected = mine.filter((d) => d.decision === "reject").length;
      if (mine.length >= minDecisions && rejected / mine.length >= rejectionRate) candidates.push({ criterion, rejected, total: mine.length });
    }
    // Holding back every criterion would leave nothing to draft; then none is held back.
    if (candidates.length < criteria.length) {
      for (const { criterion, rejected, total } of candidates) {
        const pref: AppliedPreference = {
          id: `deprioritize:${criterion.id}`,
          kind: "deprioritized-criterion",
          source: "past-decisions",
          description: `You rejected ${rejected} of ${total} suggestions on "${criterion.title}", so new drafts leave it out: the model is not asked about it and any suggestion on it is held back. Turn this off to get suggestions on it again.`,
        };
        if (on(pref)) deprioritized.push(criterion.id);
      }
    }
    const edits = inForce
      .filter((d) => d.decision === "edit" && d.editedObservation !== undefined && criteria.some((c) => c.id === d.criterionId))
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
    for (const d of edits) {
      if (editExamples.length >= maxExamples) break;
      const pref: AppliedPreference = {
        id: `edit:${d.id}`,
        kind: "edit-example",
        source: "past-decisions",
        description: `Your edit of an earlier suggestion on "${criteria.find((c) => c.id === d.criterionId)?.title}" is used as a style example.`,
      };
      if (on(pref)) editExamples.push({ decisionId: d.id, criterionId: d.criterionId, before: d.originalObservation, after: d.editedObservation! });
    }
  }
  return { applied, deprioritized, editExamples };
}
