// Task 2 evaluation: mapping a class set to misconceptions, harness against direct prompting, on
// labelled class sets. Measures mapping precision and recall against the labels, and evidence
// that is not in the response it is attributed to. The harness's teacher-confirmation step is
// not scored here (a confirming teacher would remove wrong mappings by definition).
import { draftMisconceptionBrief, extractJson, MemoryStore, TeacherGate, type Actor, type ModelAdapter, type ModelResponse } from "@teacher-gate/core";
import type { LabelledClassSet, MisconceptionDataset } from "@teacher-gate/public-goods";
import { rate, type Rate } from "./stats";

const SERVICE: Actor = { id: "eval-runner", role: "service", channel: "direct" };

/** One arm's mappings on one class set. */
export interface Task2Record {
  classSetId: string;
  arm: "harness" | "baseline";
  model: string;
  ok: boolean;
  /** `responseId/misconceptionId` pairs surfaced. */
  pairs: string[];
  /** Mappings returned before any check. */
  returned: number;
  /** Returned mappings whose quote is not in the named response. */
  quoteNotInResponse: number;
  /** Returned mappings naming a misconception not in the catalog. */
  unknownMisconception: number;
  /** Surfaced mappings whose quote is not in the named response (checked independently). */
  surfacedBad: number;
  raw?: string[];
  usage: { inputTokens: number; outputTokens: number };
}

/** The direct-prompting baseline for a class set. */
export async function baselineBrief(model: ModelAdapter, set: LabelledClassSet, catalog: MisconceptionDataset["catalog"]): Promise<ModelResponse> {
  const system = "You are a helpful teaching assistant. Read the students' responses and say which known misconceptions each response shows, quoting the student's exact words.";
  const user = [
    `Question: ${set.item.prompt}`,
    `Known misconceptions: ${JSON.stringify(catalog.map((m) => ({ id: m.id, title: m.title, description: m.description })))}`,
    "",
    "Student responses:",
    ...set.responses.map((r) => `[${r.id}] ${r.text}`),
    "",
    'Return only JSON: {"mappings":[{"responseId":"...","misconceptionId":"...","quote":"<exact words from that response>","uncertainty":"low|medium|high"}]}',
  ].join("\n");
  return model.complete({ system, user, maxOutputTokens: 3000, json: true, temperature: 0 });
}

function audit(raw: unknown, set: LabelledClassSet, catalogIds: Set<string>) {
  const list = typeof raw === "object" && raw !== null && Array.isArray((raw as { mappings?: unknown }).mappings) ? (raw as { mappings: Record<string, unknown>[] }).mappings : [];
  let quoteNotInResponse = 0;
  let unknown = 0;
  const pairs: string[] = [];
  for (const m of list) {
    const response = set.responses.find((r) => r.id === m.responseId);
    if (!catalogIds.has(String(m.misconceptionId))) unknown++;
    if (response === undefined || typeof m.quote !== "string" || !response.text.includes(m.quote)) quoteNotInResponse++;
    if (response !== undefined) pairs.push(`${response.id}/${String(m.misconceptionId)}`);
  }
  return { returned: list.length, quoteNotInResponse, unknownMisconception: unknown, pairs: [...new Set(pairs)] };
}

/** Runs both arms on every class set. */
export async function runTask2(model: ModelAdapter, data: MisconceptionDataset): Promise<Task2Record[]> {
  const ids = new Set(data.catalog.map((m) => m.id));
  const out: Task2Record[] = [];
  for (const set of data.classSets) {
    // Harness: record raw outputs while the brief is drafted.
    const raws: string[] = [];
    const usage = { inputTokens: 0, outputTokens: 0 };
    const recording: ModelAdapter = {
      label: model.label,
      async complete(r) {
        const res = await model.complete(r);
        raws.push(res.text);
        usage.inputTokens += res.usage.inputTokens;
        usage.outputTokens += res.usage.outputTokens;
        return res;
      },
    };
    const gate = new TeacherGate({ model: recording, store: new MemoryStore() });
    try {
      const draft = await draftMisconceptionBrief(gate, SERVICE, { id: set.id, item: set.item, responses: set.responses.map(({ id, learnerRef, text }) => ({ id, learnerRef, text })) }, data.catalog);
      const rawAudit = raws.map((t) => audit(extractJson(t), set, ids)).reduce((a, b) => ({ returned: a.returned + b.returned, quoteNotInResponse: a.quoteNotInResponse + b.quoteNotInResponse, unknownMisconception: a.unknownMisconception + b.unknownMisconception, pairs: [] }), { returned: 0, quoteNotInResponse: 0, unknownMisconception: 0, pairs: [] as string[] });
      out.push({ classSetId: set.id, arm: "harness", model: model.label, ok: true, ...rawAudit, pairs: draft.mappings.map((m) => `${m.responseId}/${m.misconceptionId}`), surfacedBad: draft.mappings.filter((m) => !(set.responses.find((r) => r.id === m.responseId)?.text.includes(m.quote) ?? false)).length, raw: raws, usage });
    } catch {
      out.push({ classSetId: set.id, arm: "harness", model: model.label, ok: false, pairs: [], surfacedBad: 0, returned: 0, quoteNotInResponse: 0, unknownMisconception: 0, raw: raws, usage });
    }
    try {
      const res = await baselineBrief(model, set, data.catalog);
      const a = audit(extractJson(res.text), set, ids);
      out.push({ classSetId: set.id, arm: "baseline", model: model.label, ok: true, ...a, surfacedBad: a.quoteNotInResponse, raw: [res.text], usage: res.usage });
    } catch {
      out.push({ classSetId: set.id, arm: "baseline", model: model.label, ok: false, pairs: [], surfacedBad: 0, returned: 0, quoteNotInResponse: 0, unknownMisconception: 0, usage: { inputTokens: 0, outputTokens: 0 } });
    }
  }
  return out;
}

/** Precision and recall of surfaced pairs against the labels, and evidence problems. */
export interface Task2Summary {
  arm: string;
  precision: Rate;
  recall: Rate;
  f1: number | null;
  /** Of mappings the model returned: quote not in the named response. */
  badEvidenceRaw: Rate;
  /** Of mappings that reach the teacher: quote not in the named response. */
  badEvidenceSurfaced: Rate;
  unknownMisconceptionRaw: Rate;
}

export function summariseTask2(data: MisconceptionDataset, records: readonly Task2Record[], arm: "harness" | "baseline"): Task2Summary {
  const rs = records.filter((r) => r.arm === arm && r.ok);
  const truth = new Set(data.classSets.filter((s) => rs.some((r) => r.classSetId === s.id)).flatMap((s) => s.responses.flatMap((r) => r.labels.map((l) => `${r.id}/${l}`))));
  const surfaced = rs.flatMap((r) => r.pairs);
  const tp = surfaced.filter((p) => truth.has(p)).length;
  const precision = rate(tp, surfaced.length);
  const recall = rate(tp, truth.size);
  const f1 = precision.rate === null || recall.rate === null || precision.rate + recall.rate === 0 ? null : (2 * precision.rate * recall.rate) / (precision.rate + recall.rate);
  const returned = rs.reduce((n, r) => n + r.returned, 0);
  const bad = rs.reduce((n, r) => n + r.quoteNotInResponse, 0);
  return {
    arm,
    precision,
    recall,
    f1,
    badEvidenceRaw: rate(bad, returned),
    badEvidenceSurfaced: rate(rs.reduce((n, r) => n + r.surfacedBad, 0), arm === "harness" ? surfaced.length : returned),
    unknownMisconceptionRaw: rate(rs.reduce((n, r) => n + r.unknownMisconception, 0), returned),
  };
}
