// Task 2: the class misconception brief. Across a class set of responses to one item, the model
// maps responses to known misconceptions, quoting the evidence. Every mapping is verified (known
// misconception, exact quote in that response), then the teacher confirms, rejects or reassigns
// each one before the brief is saved. Only confirmed mappings reach the saved brief.
import { z } from "zod";
import { randomBoundary, UNTRUSTED_NOTICE, wrapUntrusted } from "./boundary";
import { GateError, parse, type TeacherGate } from "./gate";
import type { TokenUsage } from "./model";
import type { Actor } from "./records";
import { Id, Misconception, Uncertainty } from "./schemas";
import { C } from "./store";
import { extractJson } from "./verify";

/** A class set: one item and the students' responses to it. */
export const ClassSet = z.strictObject({
  id: Id,
  activityId: Id.optional(),
  item: z.strictObject({ id: Id, prompt: z.string().min(1).max(8000), standards: z.array(z.string().min(1).max(200)).max(50).optional() }),
  responses: z.array(z.strictObject({ id: Id, learnerRef: Id, text: z.string().max(20_000) })).min(1).max(500),
});
export type ClassSet = z.infer<typeof ClassSet>;

/** One verified mapping of a response to a misconception. */
export interface Mapping {
  id: string;
  responseId: string;
  learnerRef: string;
  misconceptionId: string;
  quote: string;
  start: number;
  end: number;
  uncertainty: Uncertainty;
}

/** A strength the model noticed, with its evidence. */
export interface Strength {
  responseId: string;
  learnerRef: string;
  note: string;
  quote: string;
}

/** A drafted brief, awaiting the teacher's confirmation of each mapping. */
export interface BriefDraft {
  id: string;
  kind: "brief";
  classSetId: string;
  item: ClassSet["item"];
  responses: number;
  createdAt: string;
  requestedBy: Actor;
  model: string;
  /** The misconception entries offered to the model. */
  catalog: Misconception[];
  mappings: Mapping[];
  strengths: Strength[];
  dropped: { reason: "invalid-schema" | "unknown-misconception" | "unknown-response" | "quote-not-found"; misconceptionId?: string }[];
  invalidBatches: number;
  usage: TokenUsage;
}

/** A teacher's decision on one mapping. */
export const MappingDecisionInput = z.discriminatedUnion("decision", [
  z.strictObject({ mappingId: z.string().min(1).max(64), decision: z.literal("confirm") }),
  z.strictObject({ mappingId: z.string().min(1).max(64), decision: z.literal("reject") }),
  z.strictObject({ mappingId: z.string().min(1).max(64), decision: z.literal("reassign"), misconceptionId: Id }),
]);
export type MappingDecisionInput = z.infer<typeof MappingDecisionInput>;

/** A recorded mapping decision. */
export type MappingDecision = MappingDecisionInput & { briefId: string; decidedBy: string; decidedAt: string };

/** The saved one-page brief: confirmed patterns with the responses and quotes behind each. */
export interface SavedBrief {
  briefId: string;
  item: ClassSet["item"];
  savedBy: string;
  savedAt: string;
  responses: number;
  patterns: {
    misconception: Pick<Misconception, "id" | "title" | "standards" | "source">;
    count: number;
    evidence: { responseId: string; learnerRef: string; quote: string }[];
  }[];
  strengths: Strength[];
  markdown: string;
}

const MappingOutput = z.strictObject({ responseId: Id, misconceptionId: Id, quote: z.string().min(1).max(1000), uncertainty: Uncertainty });
const StrengthOutput = z.strictObject({ responseId: Id, note: z.string().min(1).max(500), quote: z.string().min(1).max(1000) });

/** The instructions for mapping a class set. */
export const BRIEF_INSTRUCTIONS = [
  "You help a teacher plan tomorrow's lesson. You read a class set of student responses to one item and identify which responses show which known misconceptions. The teacher confirms every mapping before anything is saved.",
  UNTRUSTED_NOTICE,
  "Map a response to a misconception only when its own words show it, and quote those words exactly, character for character. Use only the misconception ids listed. A response may show none, one or several. Also note up to three strengths across the class, each with an exact quote.",
  'Return only JSON: {"mappings":[{"responseId":"...","misconceptionId":"...","quote":"<exact text from that response>","uncertainty":"low|medium|high"}],"strengths":[{"responseId":"...","note":"...","quote":"<exact text>"}]}',
].join("\n");

/** Catalog entries for an item: those sharing a standard, or the whole catalog if the item names none. */
export function catalogFor(item: ClassSet["item"], catalog: readonly Misconception[], max = 25): Misconception[] {
  const standards = new Set(item.standards ?? []);
  const matching = standards.size === 0 ? catalog : catalog.filter((m) => (m.standards ?? []).some((s) => standards.has(s)));
  return matching.slice(0, max);
}

/** Splits responses into batches of at most `maxChars` characters of text (and at most 40 responses). */
function batches<T extends { text: string }>(items: readonly T[], maxChars: number): T[][] {
  const out: T[][] = [];
  let cur: T[] = [];
  let n = 0;
  for (const it of items) {
    if (cur.length > 0 && (n + it.text.length > maxChars || cur.length >= 40)) {
      out.push(cur);
      cur = [];
      n = 0;
    }
    cur.push(it);
    n += it.text.length;
  }
  if (cur.length > 0) out.push(cur);
  return out;
}

/**
 * Drafts a misconception brief for a class set. Staff only; responses over `maxResponseChars` are
 * left out (counted as `skippedResponses`), never truncated.
 */
export async function draftMisconceptionBrief(
  gate: TeacherGate,
  actor: Actor,
  rawClassSet: unknown,
  catalogInput: readonly Misconception[],
  options: { maxBatchChars?: number; maxResponseChars?: number; maxOutputTokens?: number } = {},
): Promise<BriefDraft & { skippedResponses: number }> {
  const classSet = parse(ClassSet, rawClassSet);
  const catalog = catalogFor(classSet.item, catalogInput.map((m) => parse(Misconception, m)));
  await gate.requireStaff(actor, "brief.create", { classSetId: classSet.id });
  if (catalog.length === 0) throw new GateError("validation", "No misconception entries match this item's standards.");
  const maxResponseChars = options.maxResponseChars ?? 4000;
  const usable = classSet.responses.filter((r) => r.text.trim() !== "" && r.text.length <= maxResponseChars);
  const byId = new Map(usable.map((r) => [r.id, r]));
  const system = `${BRIEF_INSTRUCTIONS}\n\nItem: ${JSON.stringify(classSet.item.prompt)}\nKnown misconceptions: ${JSON.stringify(catalog.map((m) => ({ id: m.id, title: m.title, description: m.description, ...(m.indicators === undefined ? {} : { indicators: m.indicators }) })))}`;
  const draft: BriefDraft = {
    id: crypto.randomUUID(),
    kind: "brief",
    classSetId: classSet.id,
    item: classSet.item,
    responses: classSet.responses.length,
    createdAt: gate.now(),
    requestedBy: actor,
    model: gate.model.label,
    catalog,
    mappings: [],
    strengths: [],
    dropped: [],
    invalidBatches: 0,
    usage: { inputTokens: 0, outputTokens: 0 },
  };
  const seen = new Set<string>();
  for (const batch of batches(usable, options.maxBatchChars ?? 12_000)) {
    const user = `The class set:\n${wrapUntrusted({ responses: batch.map((r) => ({ responseId: r.id, text: r.text })) }, randomBoundary())}`;
    let text: string;
    try {
      const res = await gate.model.complete({ system, user, maxOutputTokens: options.maxOutputTokens ?? 3000, json: true, temperature: 0 });
      draft.usage.inputTokens += res.usage.inputTokens;
      draft.usage.outputTokens += res.usage.outputTokens;
      text = res.text;
    } catch {
      draft.invalidBatches++;
      continue;
    }
    const raw = extractJson(text) as { mappings?: unknown; strengths?: unknown } | undefined;
    if (raw === undefined || !Array.isArray(raw.mappings)) {
      draft.invalidBatches++;
      continue;
    }
    for (const m of raw.mappings) {
      const p = MappingOutput.safeParse(m);
      if (!p.success) {
        draft.dropped.push({ reason: "invalid-schema" });
        continue;
      }
      const { responseId, misconceptionId, quote, uncertainty } = p.data;
      if (!catalog.some((c) => c.id === misconceptionId)) {
        draft.dropped.push({ reason: "unknown-misconception" });
        continue;
      }
      const response = byId.get(responseId);
      if (response === undefined || !batch.includes(response)) {
        draft.dropped.push({ reason: "unknown-response", misconceptionId });
        continue;
      }
      const at = response.text.indexOf(quote);
      if (at < 0) {
        draft.dropped.push({ reason: "quote-not-found", misconceptionId });
        continue;
      }
      const key = `${responseId}/${misconceptionId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      draft.mappings.push({ id: `m${draft.mappings.length + 1}`, responseId, learnerRef: response.learnerRef, misconceptionId, quote, start: at, end: at + quote.length, uncertainty });
    }
    for (const s of Array.isArray(raw.strengths) ? raw.strengths : []) {
      const p = StrengthOutput.safeParse(s);
      const response = p.success ? byId.get(p.data.responseId) : undefined;
      if (!p.success || response === undefined || !response.text.includes(p.data.quote) || draft.strengths.length >= 5) continue;
      draft.strengths.push({ responseId: response.id, learnerRef: response.learnerRef, note: p.data.note, quote: p.data.quote });
    }
  }
  await gate.store.put(C.briefs, draft.id, draft);
  await gate.audit("brief.create", actor, "allowed", { briefId: draft.id, classSetId: classSet.id });
  return { ...draft, skippedResponses: classSet.responses.length - usable.length };
}

async function briefOf(gate: TeacherGate, id: string): Promise<BriefDraft> {
  const b = await gate.store.get<BriefDraft>(C.briefs, id);
  if (b === undefined) throw new GateError("not-found", `Brief ${id} was not found.`);
  return b;
}

/** A brief and the decisions on it so far. Staff only. */
export async function getBrief(gate: TeacherGate, actor: Actor, briefId: string): Promise<{ draft: BriefDraft; decisions: MappingDecision[]; saved?: SavedBrief; open: string[] }> {
  await gate.requireStaff(actor, "brief.read", { briefId });
  const draft = await briefOf(gate, briefId);
  const decisions = await gate.store.list<MappingDecision>(`${C.briefs}:decisions`, (d) => d.briefId === briefId);
  const decided = new Set(decisions.map((d) => d.mappingId));
  const saved = await gate.store.get<SavedBrief>(`${C.briefs}:saved`, briefId);
  return { draft, decisions, ...(saved === undefined ? {} : { saved }), open: draft.mappings.filter((m) => !decided.has(m.id)).map((m) => m.id) };
}

/** Records the teacher's confirm, reject or reassign on one mapping. Teacher, direct. */
export async function decideMapping(gate: TeacherGate, actor: Actor, briefId: string, raw: unknown): Promise<MappingDecision> {
  const input = parse(MappingDecisionInput, raw);
  await gate.requireTeacherDirect(actor, "brief.decide", { briefId, mappingId: input.mappingId });
  const draft = await briefOf(gate, briefId);
  if ((await gate.store.get(`${C.briefs}:saved`, briefId)) !== undefined) throw new GateError("conflict", "This brief was already saved.");
  if (!draft.mappings.some((m) => m.id === input.mappingId)) throw new GateError("not-found", `Brief ${briefId} has no mapping ${input.mappingId}.`);
  if (input.decision === "reassign" && !draft.catalog.some((c) => c.id === input.misconceptionId)) throw new GateError("validation", `Unknown misconception ${input.misconceptionId}.`);
  const record: MappingDecision = { ...input, briefId, decidedBy: actor.id, decidedAt: gate.now() };
  await gate.store.put(`${C.briefs}:decisions`, `${briefId}/${input.mappingId}`, record);
  await gate.audit("brief.decide", actor, "allowed", { briefId, mappingId: input.mappingId, decision: input.decision });
  return record;
}

/** Renders a saved brief as a one-page Markdown document. */
export function renderBrief(brief: Omit<SavedBrief, "markdown">): string {
  const lines = [`# Misconception brief: ${brief.item.id}`, "", `> ${brief.item.prompt.replace(/\n/g, " ")}`, "", `${brief.responses} responses. Patterns confirmed by the teacher, most common first.`, ""];
  if (brief.patterns.length === 0) lines.push("No misconceptions were confirmed.", "");
  for (const p of brief.patterns) {
    lines.push(`## ${p.misconception.title} (${p.count})`);
    if (p.misconception.standards?.length) lines.push(`Standards: ${p.misconception.standards.join(", ")}`);
    if (p.misconception.source) lines.push(`Source: ${p.misconception.source}`);
    lines.push("");
    for (const e of p.evidence) lines.push(`- ${e.learnerRef} (${e.responseId}): "${e.quote}"`);
    lines.push("");
  }
  if (brief.strengths.length > 0) {
    lines.push("## Strengths to build on", "");
    for (const s of brief.strengths) lines.push(`- ${s.note} — ${s.learnerRef}: "${s.quote}"`);
    lines.push("");
  }
  lines.push(`Saved by ${brief.savedBy} at ${brief.savedAt}. Drafted with AI; every pattern above was confirmed by the teacher.`);
  return lines.join("\n");
}

/** Saves the brief once every mapping is decided. Only confirmed and reassigned mappings appear. Teacher, direct. */
export async function saveBrief(gate: TeacherGate, actor: Actor, briefId: string): Promise<SavedBrief> {
  await gate.requireTeacherDirect(actor, "brief.save", { briefId });
  const { draft, decisions, saved, open } = await getBrief(gate, actor, briefId);
  if (saved !== undefined) return saved;
  if (open.length > 0) {
    await gate.audit("brief.save", actor, "denied", { briefId }, `${open.length} mappings open`);
    throw new GateError("conflict", `Confirm or reject every mapping first (${open.join(", ")} open).`);
  }
  const byMapping = new Map(decisions.map((d) => [d.mappingId, d]));
  const groups = new Map<string, { responseId: string; learnerRef: string; quote: string }[]>();
  for (const m of draft.mappings) {
    const d = byMapping.get(m.id)!;
    if (d.decision === "reject") continue;
    const target = d.decision === "reassign" ? d.misconceptionId : m.misconceptionId;
    const list = groups.get(target) ?? [];
    if (!list.some((e) => e.responseId === m.responseId)) list.push({ responseId: m.responseId, learnerRef: m.learnerRef, quote: m.quote });
    groups.set(target, list);
  }
  const patterns = [...groups].map(([id, evidence]) => {
    const m = draft.catalog.find((c) => c.id === id)!;
    return { misconception: { id: m.id, title: m.title, ...(m.standards === undefined ? {} : { standards: m.standards }), ...(m.source === undefined ? {} : { source: m.source }) }, count: evidence.length, evidence };
  }).sort((a, b) => b.count - a.count || a.misconception.id.localeCompare(b.misconception.id));
  const base = { briefId, item: draft.item, savedBy: actor.id, savedAt: gate.now(), responses: draft.responses, patterns, strengths: draft.strengths };
  const result: SavedBrief = { ...base, markdown: renderBrief(base) };
  await gate.store.put(`${C.briefs}:saved`, briefId, result);
  await gate.audit("brief.save", actor, "allowed", { briefId });
  return result;
}
