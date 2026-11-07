// Language and reading level, applied only after the teacher has approved the content. A variant is
// rewritten from the release snapshot (the teacher's approved words), never from the model's draft,
// and it reaches the student only after a teacher approves the variant too, with moderation.
import { z } from "zod";
import { GateError, type TeacherGate } from "./gate";
import type { Actor, ReleaseRecord, ReleaseVariant } from "./records";
import { TeacherGuidance } from "./schemas";
import { C } from "./store";
import { extractJson } from "./verify";

/** What to produce: a language, a reading level, or both. */
export const VariantRequest = z.strictObject({
  language: TeacherGuidance.shape.language,
  readingLevel: TeacherGuidance.shape.readingLevel,
}).refine((v) => v.language !== undefined || v.readingLevel !== undefined, "name a language or a reading level");
export type VariantRequest = z.infer<typeof VariantRequest>;

/** The rewrite instructions. The teacher's approved feedback is the only content. */
export function variantInstructions(v: VariantRequest): string {
  return [
    "You rewrite a teacher's approved feedback for a student. Keep its meaning exactly: add no new advice, praise, criticism, grades or levels, and remove nothing the teacher said.",
    v.readingLevel === undefined ? "" : `Rewrite it so a student who reads at about US grade ${v.readingLevel} can understand it: short sentences, common words.`,
    v.language === undefined ? "" : `Write it in the language with BCP 47 tag "${v.language}".`,
    "Text inside quotation marks that comes from the student's work stays exactly as written.",
    'Return only JSON: {"findings":[{"findingId":"<same id>","text":"<rewritten text>"}]} with every finding, in the same order.',
  ].filter(Boolean).join("\n");
}

const Output = z.object({ findings: z.array(z.object({ findingId: z.string(), text: z.string().trim().min(1).max(4000) })) });

/**
 * Drafts a language or reading-level variant of a released draft. Teachers and services may ask;
 * the variant is not shown to the student until a teacher approves it.
 */
export async function draftVariant(gate: TeacherGate, actor: Actor, draftId: string, raw: unknown): Promise<ReleaseVariant> {
  const parsed = VariantRequest.safeParse(raw);
  if (!parsed.success) throw new GateError("validation", z.prettifyError(parsed.error));
  const request = parsed.data;
  await gate.requireStaff(actor, "variant.create", { draftId });
  const release = await gate.store.get<ReleaseRecord>(C.releases, draftId);
  if (release === undefined) throw new GateError("conflict", "Only released feedback can be rewritten: the teacher approves the content first.");
  const res = await gate.model.complete({
    system: variantInstructions(request),
    user: JSON.stringify({ findings: release.findings.map((f) => ({ findingId: f.findingId, text: f.text })) }),
    maxOutputTokens: 2000,
    json: true,
    temperature: 0,
  });
  const out = Output.safeParse(extractJson(res.text));
  const ids = release.findings.map((f) => f.findingId);
  if (!out.success || out.data.findings.length !== ids.length || out.data.findings.some((f, i) => f.findingId !== ids[i])) {
    await gate.audit("variant.create", actor, "denied", { draftId }, "the model's rewrite did not keep every finding");
    throw new GateError("conflict", "The rewrite did not return every finding unchanged in number and order; nothing was saved.");
  }
  const variant: ReleaseVariant = {
    id: crypto.randomUUID(),
    ...(request.language === undefined ? {} : { language: request.language }),
    ...(request.readingLevel === undefined ? {} : { readingLevel: request.readingLevel }),
    findings: out.data.findings.map((f) => ({ findingId: f.findingId, text: f.text })),
    model: gate.model.label,
    createdAt: gate.now(),
  };
  await gate.store.put(C.releases, draftId, { ...release, variants: [...release.variants, variant] });
  await gate.audit("variant.create", actor, "allowed", { draftId, variantId: variant.id });
  return variant;
}

/** Approves a variant for the student, after moderation. Teacher, direct. */
export async function approveVariant(gate: TeacherGate, actor: Actor, draftId: string, variantId: string): Promise<ReleaseVariant> {
  await gate.requireTeacherDirect(actor, "variant.approve", { draftId, variantId });
  const release = await gate.store.get<ReleaseRecord>(C.releases, draftId);
  const variant = release?.variants.find((v) => v.id === variantId);
  if (release === undefined || variant === undefined) throw new GateError("not-found", `Variant ${variantId} was not found.`);
  for (const f of variant.findings) {
    let ok: boolean;
    try {
      ok = (await gate.moderator.check(f.text, { audience: "student" })).allowed;
    } catch {
      ok = false;
    }
    if (!ok) {
      await gate.audit("variant.approve", actor, "denied", { draftId, variantId }, `moderation held finding ${f.findingId}`);
      throw new GateError("moderation", `Moderation (${gate.moderator.name}) held finding ${f.findingId} in this variant.`);
    }
  }
  const approved: ReleaseVariant = { ...variant, approvedBy: actor.id, approvedAt: gate.now() };
  await gate.store.put(C.releases, draftId, { ...release, variants: release.variants.map((v) => (v.id === variantId ? approved : v)) });
  await gate.audit("variant.approve", actor, "allowed", { draftId, variantId });
  return approved;
}
