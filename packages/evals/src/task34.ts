// Task 3 and Task 4 evaluations on the synthetic CER set. Both are clearly labelled simulations:
// Task 3 uses a rule-based simulated teacher, and Task 4 treats the synthetic data's author labels
// as the teacher's judgement. Neither stands in for evidence from real teachers.
import { createGoal, dryRunGoal, MemoryStore, TeacherGate, type Actor, type ModelAdapter } from "@teacher-gate/core";
import type { ScoredWritingDataset } from "@teacher-gate/public-goods";
import { rate, type Rate } from "./stats";

const TEACHER: Actor = { id: "simulated-teacher", role: "teacher", channel: "direct" };
const SERVICE: Actor = { id: "eval-runner", role: "service", channel: "direct" };
const PREFIX = "Next step:";

/** Task 3 result for one arm. */
export interface Task3Arm {
  learning: boolean;
  /** Items after the warm-up. */
  items: number;
  /** Findings on the criterion the simulated teacher always rejects, of all findings after warm-up. */
  rejectedCriterionShare: Rate;
  /**
   * The same share before the harness enforced the teacher's learned preferences: findings the
   * model wrote on that criterion, kept or dropped as `deprioritized-criterion`, of all it wrote.
   */
  rejectedCriterionRaw: Rate;
  /** Findings that reached the teacher per item after warm-up (coverage after enforcement). */
  findingsPerItem: number;
  /** Findings accepted unedited, after warm-up. */
  acceptedUnedited: Rate;
  /** Findings already in the teacher's style (starting "Next step:"), after warm-up. */
  inTeacherStyle: Rate;
  appliedPreferencesAtEnd: string[];
}

/**
 * Task 3 simulation. The simulated teacher rejects every finding on `rejectCriterion` and rewrites
 * every other finding to start with "Next step:", accepting those already in that style. The same
 * items run with learning off and on; measures are taken after `warmup` items.
 */
export async function runTask3(model: ModelAdapter, ds: ScoredWritingDataset, options: { rejectCriterion: string; warmup?: number; items?: number }): Promise<Task3Arm[]> {
  const warmup = options.warmup ?? 8;
  const items = ds.items.filter((i) => !(i.tags ?? []).includes("injection")).slice(0, options.items ?? 24);
  const arms: Task3Arm[] = [];
  for (const learning of [false, true]) {
    const gate = new TeacherGate({ model, store: new MemoryStore(), retries: 0 });
    await gate.putActivity(TEACHER, { ...ds.activity, guidance: { learnFromDecisions: learning } });
    let total = 0;
    let onRejected = 0;
    let unedited = 0;
    let styled = 0;
    let held = 0;
    for (const [n, item] of items.entries()) {
      const draft = await gate.draftFeedback(SERVICE, { id: item.id, activityId: ds.activity.id, learnerRef: "learner", artifacts: [{ id: "work", text: item.text }] });
      if (n >= warmup) held += draft.dropped.filter((x) => x.reason === "deprioritized-criterion").length;
      for (const f of draft.findings) {
        const inStyle = f.observation.trim().startsWith(PREFIX);
        const decision = f.criterionId === options.rejectCriterion ? { decision: "reject" as const } : inStyle ? { decision: "accept" as const } : { decision: "edit" as const, text: `${PREFIX} ${f.observation}` };
        await gate.decide(TEACHER, draft.id, { findingId: f.id, ...decision });
        if (n >= warmup) {
          total++;
          if (f.criterionId === options.rejectCriterion) onRejected++;
          if (decision.decision === "accept") unedited++;
          if (inStyle) styled++;
        }
      }
    }
    arms.push({
      learning,
      items: items.length - warmup,
      rejectedCriterionShare: rate(onRejected, total),
      rejectedCriterionRaw: rate(onRejected + held, total + held),
      findingsPerItem: total / Math.max(1, items.length - warmup),
      acceptedUnedited: rate(unedited, total),
      inTeacherStyle: rate(styled, total),
      appliedPreferencesAtEnd: (await gate.preferencesFor(ds.activity.id)).applied.map((p) => p.id),
    });
  }
  return arms;
}

/** Task 4 result: the goal judge against the labels used as the teacher's judgement. */
export interface Task4Result {
  goal: string;
  items: number;
  agreement: Rate;
  unverified: Rate;
  /** Cohen's kappa over verified judgements. */
  kappa: number | null;
  confusion: { tp: number; fp: number; fn: number; tn: number };
}

/**
 * Task 4: a goal dry-run on every item; the "teacher" judges the goal met when the item's label on
 * the goal's criterion is above the lowest level.
 */
export async function runTask4(model: ModelAdapter, ds: ScoredWritingDataset, options: { statement: string; criterionId: string }): Promise<Task4Result> {
  const gate = new TeacherGate({ model, store: new MemoryStore(), retries: 0 });
  await gate.putActivity(TEACHER, ds.activity);
  const goal = await createGoal(gate, TEACHER, { activityId: ds.activity.id, statement: options.statement, criterionId: options.criterionId });
  const lowest = ds.activity.rubric.criteria.find((c) => c.id === options.criterionId)!.levels[0]!.id;
  const dry = await dryRunGoal(gate, SERVICE, goal.id, ds.items.map((i) => ({ id: i.id, activityId: ds.activity.id, learnerRef: "learner", artifacts: [{ id: "work", text: i.text }] })));
  const c = { tp: 0, fp: 0, fn: 0, tn: 0 };
  for (const r of dry.results) {
    if (r.met === null) continue;
    const teacher = ds.items.find((i) => i.id === r.submissionId)!.labels[options.criterionId] !== lowest;
    if (r.met && teacher) c.tp++;
    else if (r.met && !teacher) c.fp++;
    else if (!r.met && teacher) c.fn++;
    else c.tn++;
  }
  const n = c.tp + c.fp + c.fn + c.tn;
  const po = n === 0 ? 0 : (c.tp + c.tn) / n;
  const pa = n === 0 ? 0 : (c.tp + c.fp) / n;
  const pb = n === 0 ? 0 : (c.tp + c.fn) / n;
  const pe = pa * pb + (1 - pa) * (1 - pb);
  return { goal: options.statement, items: dry.results.length, agreement: rate(c.tp + c.tn, n), unverified: rate(dry.unverified, dry.results.length), kappa: n < 2 || pe === 1 ? null : (po - pe) / (1 - pe), confusion: c };
}
