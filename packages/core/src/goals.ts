// Task 4: a teacher's goal becomes an evaluation. The teacher states a goal ("students cite
// evidence for every claim"); the harness compiles it into a judge, dry-runs it on past work so the
// teacher sees what it would flag (nothing reaches students), then tracks over time how often the
// AI's judgement matches the teacher's own, and warns when that agreement drifts.
import { z } from "zod";
import { randomBoundary, UNTRUSTED_NOTICE, wrapUntrusted } from "./boundary";
import { GateError, parse, type TeacherGate } from "./gate";
import type { Actor, ReleaseRecord } from "./records";
import { Id, Submission } from "./schemas";
import { C } from "./store";
import { extractJson } from "./verify";

/** What a goal is judged on: the student's work, or the feedback released to the student. */
export const GoalTarget = z.enum(["work", "feedback"]);
export type GoalTarget = z.infer<typeof GoalTarget>;

/** A teacher's goal for an activity. */
export const NewGoal = z.strictObject({
  activityId: Id,
  statement: z.string().trim().min(5).max(1000),
  /** The rubric criterion the goal relates to, if any. */
  criterionId: Id.optional(),
  /** `work` (default) uses the built-in judge; a named evaluator (e.g. a Learning Commons one) may judge `feedback`. */
  target: GoalTarget.optional(),
  /** The name of a registered {@link GoalEvaluator}; default `work-judge`. */
  evaluator: z.string().min(1).max(100).optional(),
});
export type NewGoal = z.infer<typeof NewGoal>;

/** A stored goal. */
export interface Goal extends NewGoal {
  id: string;
  target: GoalTarget;
  evaluator: string;
  createdBy: string;
  createdAt: string;
}

/** One judgement of a goal on one submission. `met` is null when the judge's answer could not be verified. */
export interface GoalJudgement {
  met: boolean | null;
  /** Exact quotes from the work supporting the judgement, verified. */
  evidence: string[];
  rationale?: string;
}

/** Something that judges a goal on a submission. */
export interface GoalEvaluator {
  readonly name: string;
  readonly target: GoalTarget;
  judge(goal: Goal, input: { submission: Submission; release?: ReleaseRecord }): Promise<GoalJudgement>;
}

/** The judge instructions. The goal is the teacher's own text; the work is untrusted. */
export const GOAL_JUDGE_INSTRUCTIONS = [
  "You check one student's work against a goal their teacher set. You only report whether the work meets the goal; you never grade it, and the teacher reviews what you say.",
  UNTRUSTED_NOTICE,
  'If the work meets the goal, quote the exact words that show it. If it does not, quote the exact words where it falls short, if any. Return only JSON: {"met": true|false, "evidence": ["<exact text from the work>"], "rationale": "<one sentence>"}',
].join("\n");

const JudgeOutput = z.object({ met: z.boolean(), evidence: z.array(z.string().min(1).max(1000)).max(5).default([]), rationale: z.string().max(1000).optional() });

/** The built-in judge on student work, through the gate's model. Unverifiable quotes make `met` null. */
export function workJudge(gate: TeacherGate): GoalEvaluator {
  return {
    name: "work-judge",
    target: "work",
    async judge(goal, { submission }) {
      const system = `${GOAL_JUDGE_INSTRUCTIONS}\n\nThe teacher's goal: ${JSON.stringify(goal.statement)}`;
      const user = `The work:\n${wrapUntrusted({ artifacts: submission.artifacts.map((a) => ({ artifact: a.id, text: a.text })) }, randomBoundary())}`;
      const res = await gate.model.complete({ system, user, maxOutputTokens: 600, json: true, temperature: 0 });
      const parsed = JudgeOutput.safeParse(extractJson(res.text));
      if (!parsed.success) return { met: null, evidence: [] };
      const text = submission.artifacts.map((a) => a.text).join("\n");
      const verified = parsed.data.evidence.every((q) => text.includes(q));
      return { met: verified ? parsed.data.met : null, evidence: verified ? parsed.data.evidence : [], ...(parsed.data.rationale === undefined ? {} : { rationale: parsed.data.rationale }) };
    },
  };
}

function evaluatorFor(gate: TeacherGate, goal: Goal, extra: readonly GoalEvaluator[]): GoalEvaluator {
  const all = [workJudge(gate), ...extra];
  const found = all.find((e) => e.name === goal.evaluator);
  if (found === undefined) throw new GateError("validation", `No goal evaluator named ${goal.evaluator} is registered.`);
  return found;
}

/** Creates a goal. Teacher, direct. */
export async function createGoal(gate: TeacherGate, actor: Actor, raw: unknown, evaluators: readonly GoalEvaluator[] = []): Promise<Goal> {
  const input = parse(NewGoal, raw);
  await gate.requireTeacherDirect(actor, "goal.create", { activityId: input.activityId });
  const activity = await gate.getActivity(input.activityId);
  if (input.criterionId !== undefined && !activity.rubric.criteria.some((c) => c.id === input.criterionId)) throw new GateError("validation", `The rubric has no criterion ${input.criterionId}.`);
  const evaluator = input.evaluator ?? "work-judge";
  const target = input.target ?? "work";
  const goal: Goal = { ...input, id: crypto.randomUUID(), target, evaluator, createdBy: actor.id, createdAt: gate.now() };
  if (evaluatorFor(gate, goal, evaluators).target !== target) throw new GateError("validation", `Evaluator ${evaluator} judges ${target === "work" ? "feedback" : "work"}, not ${target}.`);
  await gate.store.put(C.goals, goal.id, goal);
  await gate.audit("goal.create", actor, "allowed", { goalId: goal.id, activityId: goal.activityId });
  return goal;
}

async function goalOf(gate: TeacherGate, id: string): Promise<Goal> {
  const g = await gate.store.get<Goal>(C.goals, id);
  if (g === undefined) throw new GateError("not-found", `Goal ${id} was not found.`);
  return g;
}

async function latestRelease(gate: TeacherGate, submissionId: string): Promise<ReleaseRecord | undefined> {
  return (await gate.store.list<ReleaseRecord>(C.releases, (r) => r.submissionId === submissionId)).sort((a, b) => a.releasedAt.localeCompare(b.releasedAt)).at(-1);
}

/** A dry run: what the goal's evaluation would flag on past work. Nothing is stored against students. */
export interface DryRun {
  goalId: string;
  results: ({ submissionId: string; learnerRef: string } & GoalJudgement)[];
  met: number;
  notMet: number;
  unverified: number;
}

/** Dry-runs a goal on de-identified past work. Staff only; results are only shown to the teacher. */
export async function dryRunGoal(gate: TeacherGate, actor: Actor, goalId: string, rawSubmissions: unknown[], evaluators: readonly GoalEvaluator[] = []): Promise<DryRun> {
  await gate.requireStaff(actor, "goal.dry-run", { goalId });
  const goal = await goalOf(gate, goalId);
  const evaluator = evaluatorFor(gate, goal, evaluators);
  const results: DryRun["results"] = [];
  for (const raw of rawSubmissions.slice(0, 200)) {
    const submission = parse(Submission, raw);
    const release = evaluator.target === "feedback" ? await latestRelease(gate, submission.id) : undefined;
    const j = await evaluator.judge(goal, { submission, ...(release === undefined ? {} : { release }) });
    results.push({ submissionId: submission.id, learnerRef: submission.learnerRef, ...j });
  }
  await gate.audit("goal.dry-run", actor, "allowed", { goalId, n: String(results.length) });
  return { goalId, results, met: results.filter((r) => r.met === true).length, notMet: results.filter((r) => r.met === false).length, unverified: results.filter((r) => r.met === null).length };
}

/** A stored AI or teacher judgement, for monitoring. */
export interface GoalObservation {
  goalId: string;
  submissionId: string;
  source: "ai" | "teacher";
  met: boolean | null;
  at: string;
  by: string;
}

/** Records the AI's judgement of a goal on a submission, for monitoring. Staff only. */
export async function evaluateGoal(gate: TeacherGate, actor: Actor, goalId: string, rawSubmission: unknown, evaluators: readonly GoalEvaluator[] = []): Promise<GoalObservation & GoalJudgement> {
  await gate.requireStaff(actor, "goal.evaluate", { goalId });
  const goal = await goalOf(gate, goalId);
  const submission = parse(Submission, rawSubmission);
  const evaluator = evaluatorFor(gate, goal, evaluators);
  const release = evaluator.target === "feedback" ? await latestRelease(gate, submission.id) : undefined;
  const j = await evaluator.judge(goal, { submission, ...(release === undefined ? {} : { release }) });
  const obs: GoalObservation = { goalId, submissionId: submission.id, source: "ai", met: j.met, at: gate.now(), by: gate.model.label };
  await gate.store.put(C.goalRuns, `${goalId}/${submission.id}/ai`, obs);
  await gate.audit("goal.evaluate", actor, "allowed", { goalId, submissionId: submission.id });
  return { ...obs, ...j };
}

/** Records the teacher's own judgement of a goal on a submission. Teacher, direct. */
export async function recordGoalJudgement(gate: TeacherGate, actor: Actor, goalId: string, submissionId: string, met: boolean): Promise<GoalObservation> {
  await gate.requireTeacherDirect(actor, "goal.judge", { goalId, submissionId });
  await goalOf(gate, goalId);
  const obs: GoalObservation = { goalId, submissionId: parse(Id, submissionId), source: "teacher", met, at: gate.now(), by: actor.id };
  await gate.store.put(C.goalJudgments, `${goalId}/${submissionId}`, obs);
  await gate.audit("goal.judge", actor, "allowed", { goalId, submissionId });
  return obs;
}

/** Agreement in one time window. */
export interface GoalWindow {
  start: string;
  end: string;
  pairs: number;
  agreement: number | null;
  /** Cohen's kappa for the binary met / not met judgement. */
  kappa: number | null;
}

/** The goal's monitoring report. */
export interface GoalReport {
  goal: Goal;
  windows: GoalWindow[];
  overall: GoalWindow;
  /** Set when agreement fell by more than the threshold between the first and latest full windows. */
  drift?: { from: number; to: number; delta: number; alert: string };
  unverifiedAi: number;
}

/** Cohen's kappa for paired booleans; null if fewer than two pairs or no variation. */
export function binaryKappa(pairs: readonly [boolean, boolean][]): number | null {
  const n = pairs.length;
  if (n < 2) return null;
  const po = pairs.filter(([a, b]) => a === b).length / n;
  const pa = pairs.filter(([a]) => a).length / n;
  const pb = pairs.filter(([, b]) => b).length / n;
  const pe = pa * pb + (1 - pa) * (1 - pb);
  return pe === 1 ? null : (po - pe) / (1 - pe);
}

/**
 * How often the AI's judgement matched the teacher's, per window of `windowDays` (by the teacher's
 * judgement time), with a drift alert when agreement falls by more than `driftThreshold` between the
 * first and latest windows that have at least `minPairs` pairs. Staff only.
 */
export async function goalReport(gate: TeacherGate, actor: Actor, goalId: string, options: { windowDays?: number; driftThreshold?: number; minPairs?: number } = {}): Promise<GoalReport> {
  await gate.requireStaff(actor, "goal.report", { goalId });
  const goal = await goalOf(gate, goalId);
  const windowMs = (options.windowDays ?? 7) * 86_400_000;
  const threshold = options.driftThreshold ?? 0.15;
  const minPairs = options.minPairs ?? 5;
  const teacher = await gate.store.list<GoalObservation>(C.goalJudgments, (o) => o.goalId === goalId);
  const ai = new Map((await gate.store.list<GoalObservation>(C.goalRuns, (o) => o.goalId === goalId)).map((o) => [o.submissionId, o]));
  const pairs = teacher.flatMap((t) => {
    const a = ai.get(t.submissionId);
    return a === undefined || a.met === null || t.met === null ? [] : [{ at: Date.parse(t.at), ai: a.met, teacher: t.met }];
  }).sort((x, y) => x.at - y.at);
  const summarise = (ps: typeof pairs, start: number, end: number): GoalWindow => ({
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    pairs: ps.length,
    agreement: ps.length === 0 ? null : ps.filter((p) => p.ai === p.teacher).length / ps.length,
    kappa: binaryKappa(ps.map((p) => [p.ai, p.teacher])),
  });
  const windows: GoalWindow[] = [];
  if (pairs.length > 0) {
    const first = pairs[0]!.at;
    for (let s = first; s <= pairs.at(-1)!.at; s += windowMs) windows.push(summarise(pairs.filter((p) => p.at >= s && p.at < s + windowMs), s, s + windowMs));
  }
  const full = windows.filter((w) => w.pairs >= minPairs && w.agreement !== null);
  const report: GoalReport = {
    goal,
    windows,
    overall: summarise(pairs, pairs[0]?.at ?? 0, (pairs.at(-1)?.at ?? 0) + 1),
    unverifiedAi: [...ai.values()].filter((o) => o.met === null).length,
  };
  if (full.length >= 2) {
    const from = full[0]!.agreement!;
    const to = full.at(-1)!.agreement!;
    if (from - to > threshold) report.drift = { from, to, delta: to - from, alert: `Agreement with your judgement fell from ${(from * 100).toFixed(0)}% to ${(to * 100).toFixed(0)}%. Review recent AI judgements before relying on them.` };
  }
  return report;
}
