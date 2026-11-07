// Task 1 evaluation: verifiable rubric feedback, harness against direct prompting, on the same
// items with the same model. Every model output is recorded raw so results can be re-scored.
import {
  extractJson,
  FindingOutput,
  FORBIDDEN_FIELDS,
  findLeaks,
  gradeLanguage,
  MemoryStore,
  TeacherGate,
  type Activity,
  type Actor,
  type Criterion,
  type DecisionRecord,
  type ModelAdapter,
  type ModelRequest,
  type ModelResponse,
} from "@teacher-gate/core";
import { loadLcEvaluator, runLcEvaluator, type LcEvaluator, type LcFeedbackEvaluatorId, type ScoredItem } from "@teacher-gate/public-goods";
import { runBaseline } from "./baseline";

const TEACHER: Actor = { id: "simulated-teacher", role: "teacher", channel: "direct" };
const SERVICE: Actor = { id: "eval-runner", role: "service", channel: "direct" };
const ARTIFACT = "work";

/** Quote accounting for one output. */
export interface QuoteStats {
  /** Excerpts whose quote is exactly in the work. */
  exact: number;
  /** Excerpts that match only after normalising whitespace, quote marks and case. */
  nearMiss: number;
  /** Excerpts not in the work even after normalising: fabricated. */
  notFound: number;
}

/** One arm's result on one item. */
export interface Task1Record {
  itemId: string;
  arm: "harness" | "baseline";
  model: string;
  groups: Record<string, string>;
  tags: string[];
  ok: boolean;
  error?: string;
  /** The output was a JSON object with a findings array. */
  parsed: boolean;
  findingsTotal: number;
  /** Findings that pass the strict finding schema and carry no grading field. */
  schemaValid: number;
  /** Findings with at least one excerpt that is not exactly in the work. */
  findingsWithInexactQuote: number;
  /** Findings with at least one excerpt not in the work even after normalising. */
  findingsWithFabricatedQuote: number;
  quotes: QuoteStats;
  /** Findings that reach a person: the teacher (harness) or the student (baseline). */
  surfaced: number;
  /** Surfaced findings with an excerpt not exactly in the work (checked independently here). */
  surfacedWithInexactQuote: number;
  /** The lowest level suggested per criterion among surfaced findings. */
  suggestions: Record<string, string>;
  /** Student-facing texts. Baseline: every observation. Harness: the released view. */
  studentFacing: string[];
  /** Leaks found in what the student would see. */
  leaks: string[];
  /** Baseline only: findings carrying a suggested level a product might display. */
  structuredLevels?: number;
  /** Harness only: the simulated teacher's decisions. */
  decisions?: { accept: number; edit: number; reject: number };
  lc?: Partial<Record<LcFeedbackEvaluatorId, 0 | 1 | null>>;
  usage?: { inputTokens: number; outputTokens: number };
  raw?: string;
}

function normalise(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();
}

/** Classifies one quote against the work. */
export function classifyQuote(quote: string, text: string): keyof QuoteStats {
  if (quote.length > 0 && text.includes(quote)) return "exact";
  if (quote.trim().length > 0 && normalise(text).includes(normalise(quote))) return "nearMiss";
  return "notFound";
}

interface LenientFinding {
  criterionId?: unknown;
  observation?: unknown;
  suggestedLevel?: unknown;
  excerpts?: unknown;
}

/** Reads findings leniently (any object in `findings`), for counting what the model produced. */
export function lenientFindings(raw: unknown): LenientFinding[] | undefined {
  if (typeof raw !== "object" || raw === null || !Array.isArray((raw as { findings?: unknown }).findings)) return undefined;
  return (raw as { findings: unknown[] }).findings.filter((f): f is LenientFinding => typeof f === "object" && f !== null);
}

function quotesOf(f: LenientFinding): string[] {
  return Array.isArray(f.excerpts) ? f.excerpts.flatMap((e) => (typeof e === "object" && e !== null && typeof (e as { quote?: unknown }).quote === "string" ? [(e as { quote: string }).quote] : [])) : [];
}

/** Counts schema validity and quote accuracy over a raw output's findings. */
export function scoreRaw(raw: unknown, text: string) {
  const list = lenientFindings(raw);
  const quotes: QuoteStats = { exact: 0, nearMiss: 0, notFound: 0 };
  let schemaValid = 0;
  let inexact = 0;
  let fabricated = 0;
  for (const f of list ?? []) {
    const hasForbidden = Object.keys(f).some((k) => (FORBIDDEN_FIELDS as readonly string[]).includes(k.toLowerCase()));
    if (!hasForbidden && FindingOutput.safeParse(f).success) schemaValid++;
    const qs = quotesOf(f);
    const kinds = qs.map((q) => classifyQuote(q, text));
    for (const k of kinds) quotes[k]++;
    if (qs.length === 0 || kinds.some((k) => k !== "exact")) inexact++;
    if (qs.length === 0 || kinds.some((k) => k === "notFound")) fabricated++;
  }
  return { parsed: list !== undefined, findingsTotal: list?.length ?? 0, schemaValid, quotes, findingsWithInexactQuote: inexact, findingsWithFabricatedQuote: fabricated };
}

function levelIndex(criterion: Criterion | undefined, levelId: string | undefined): number {
  return criterion === undefined || levelId === undefined ? -1 : criterion.levels.findIndex((l) => l.id === levelId);
}

/** The lowest suggested level per criterion, the cautious reading when findings disagree. */
function lowestSuggestions(activity: Activity, findings: { criterionId: string; level?: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of findings) {
    const c = activity.rubric.criteria.find((x) => x.id === f.criterionId);
    const i = levelIndex(c, f.level);
    if (i < 0) continue;
    const cur = levelIndex(c, out[f.criterionId]);
    if (cur < 0 || i < cur) out[f.criterionId] = f.level!;
  }
  return out;
}

/** Records the last response, so the harness arm's raw output is kept too. */
class Recording implements ModelAdapter {
  last?: ModelResponse;
  constructor(readonly inner: ModelAdapter) {}
  get label() {
    return this.inner.label;
  }
  async complete(r: ModelRequest) {
    this.last = await this.inner.complete(r);
    return this.last;
  }
}

/**
 * The simulated teacher, driven by the dataset's human labels (a stand-in for real teacher
 * decisions, stated as such in every report): reject a finding whose suggested level is two or
 * more levels from the human label; edit out sentences that state a grade or level; accept the rest.
 */
export function simulatedDecision(activity: Activity, item: ScoredItem, f: { criterionId: string; observation: string; suggestedLevelId?: string }): { decision: "accept" } | { decision: "reject" } | { decision: "edit"; text: string } {
  const c = activity.rubric.criteria.find((x) => x.id === f.criterionId);
  const s = levelIndex(c, f.suggestedLevelId);
  const h = levelIndex(c, item.labels[f.criterionId]);
  if (s >= 0 && h >= 0 && Math.abs(s - h) >= 2) return { decision: "reject" };
  if (gradeLanguage(f.observation, c).length === 0) return { decision: "accept" };
  const kept = f.observation.split(/(?<=[.!?])\s+/).filter((sentence) => gradeLanguage(sentence, c).length === 0).join(" ").trim();
  return kept.length === 0 ? { decision: "reject" } : { decision: "edit", text: kept };
}

/** Options for one Task 1 item. */
export interface Task1Options {
  activity: Activity;
  model: ModelAdapter;
  judge?: ModelAdapter;
  evaluators?: LcEvaluator[];
  maxOutputTokens?: number;
}

async function judgeAll(o: Task1Options, studentText: string, texts: string[]): Promise<Task1Record["lc"]> {
  if (o.judge === undefined || o.evaluators === undefined || o.evaluators.length === 0 || texts.length === 0) return undefined;
  const feedbackText = texts.map((t) => `- ${t}`).join("\n");
  const out: Task1Record["lc"] = {};
  for (const ev of o.evaluators) {
    try {
      out[ev.id] = (await runLcEvaluator(o.judge, ev, { studentText, feedbackText })).score;
    } catch {
      out[ev.id] = null;
    }
  }
  return out;
}

/** Runs the harness arm on one item. */
export async function runHarnessItem(o: Task1Options, item: ScoredItem): Promise<Task1Record> {
  const model = new Recording(o.model);
  const gate = new TeacherGate({ model, store: new MemoryStore(), retries: 0, ...(o.maxOutputTokens === undefined ? {} : { maxOutputTokens: o.maxOutputTokens }) });
  await gate.putActivity(TEACHER, o.activity);
  const base = { itemId: item.id, arm: "harness" as const, model: o.model.label, groups: item.groups, tags: item.tags ?? [] };
  const draft = await gate.draftFeedback(SERVICE, { id: item.id.slice(0, 128), activityId: o.activity.id, learnerRef: "learner", artifacts: [{ id: ARTIFACT, text: item.text }] });
  const raw = model.last?.text;
  const scored = scoreRaw(raw === undefined ? undefined : extractJson(raw), item.text);
  if (draft.status === "failed" || draft.status === "skipped") {
    return { ...base, ok: false, error: draft.status === "skipped" ? `skipped:${draft.skipReason}` : "model call failed", ...scored, surfaced: 0, surfacedWithInexactQuote: 0, suggestions: {}, studentFacing: [], leaks: [], ...(raw === undefined ? {} : { raw }) };
  }
  const surfacedWithInexactQuote = draft.findings.filter((f) => f.excerpts.some((e) => item.text.slice(e.start, e.end) !== e.quote)).length;
  const decisions = { accept: 0, edit: 0, reject: 0 };
  for (const f of draft.findings) {
    const d = simulatedDecision(o.activity, item, f);
    decisions[d.decision]++;
    await gate.decide(TEACHER, draft.id, { findingId: f.id, ...d });
  }
  let studentFacing: string[] = [];
  let leaks: string[] = [];
  if (decisions.accept + decisions.edit > 0) {
    const release = await gate.release(TEACHER, draft.id);
    const view = await gate.studentView({ id: "learner", role: "student", channel: "direct" }, draft.submissionId);
    studentFacing = view.findings.map((f) => f.text);
    const all = await gate.store.list<DecisionRecord>("decisions");
    leaks = findLeaks(view, { activity: o.activity, draft, decisions: all, release }).map((l) => `${l.kind}:${l.detail}`);
  }
  return {
    ...base,
    ok: true,
    ...scored,
    surfaced: draft.findings.length,
    surfacedWithInexactQuote,
    suggestions: lowestSuggestions(o.activity, draft.findings.map((f) => ({ criterionId: f.criterionId, ...(f.suggestedLevelId === undefined ? {} : { level: f.suggestedLevelId }) }))),
    studentFacing,
    leaks,
    decisions,
    ...(await judgeAll(o, item.text, studentFacing).then((lc) => (lc === undefined ? {} : { lc }))),
    ...(model.last === undefined ? {} : { usage: model.last.usage }),
    ...(raw === undefined ? {} : { raw }),
  };
}

/** Runs the direct-prompting arm on one item. */
export async function runBaselineItem(o: Task1Options, item: ScoredItem): Promise<Task1Record> {
  const base = { itemId: item.id, arm: "baseline" as const, model: o.model.label, groups: item.groups, tags: item.tags ?? [] };
  let res: ModelResponse;
  try {
    res = await runBaseline(o.model, o.activity, item.text, o.maxOutputTokens);
  } catch (e) {
    return { ...base, ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "error", parsed: false, findingsTotal: 0, schemaValid: 0, findingsWithInexactQuote: 0, findingsWithFabricatedQuote: 0, quotes: { exact: 0, nearMiss: 0, notFound: 0 }, surfaced: 0, surfacedWithInexactQuote: 0, suggestions: {}, studentFacing: [], leaks: [] };
  }
  const json = extractJson(res.text);
  const scored = scoreRaw(json, item.text);
  const list = lenientFindings(json) ?? [];
  const studentFacing = list.flatMap((f) => (typeof f.observation === "string" ? [f.observation] : []));
  const leaks: string[] = [];
  for (const f of list) {
    const c = o.activity.rubric.criteria.find((x) => x.id === f.criterionId);
    if (typeof f.observation === "string") for (const hit of gradeLanguage(f.observation, c)) leaks.push(`level:${hit}`);
    for (const k of Object.keys(f)) if ((FORBIDDEN_FIELDS as readonly string[]).includes(k.toLowerCase())) leaks.push(`grade-field:${k}`);
  }
  return {
    ...base,
    ok: true,
    ...scored,
    surfaced: list.length,
    surfacedWithInexactQuote: scored.findingsWithInexactQuote,
    suggestions: lowestSuggestions(o.activity, list.flatMap((f) => (typeof f.criterionId === "string" ? [{ criterionId: f.criterionId, ...(typeof f.suggestedLevel === "string" ? { level: f.suggestedLevel } : {}) }] : []))),
    studentFacing,
    leaks,
    structuredLevels: list.filter((f) => typeof f.suggestedLevel === "string").length,
    ...(await judgeAll(o, item.text, studentFacing).then((lc) => (lc === undefined ? {} : { lc }))),
    usage: res.usage,
    raw: res.text,
  };
}

/** Loads the Learning Commons feedback evaluators used as judges. */
export async function loadJudges(ids: readonly LcFeedbackEvaluatorId[]): Promise<LcEvaluator[]> {
  return Promise.all(ids.map((id) => loadLcEvaluator(id)));
}
