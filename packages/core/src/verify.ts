// Deterministic checks on model output. These are code, not prompts, so they behave the same on
// every model and are covered by tests. The exact-quote rule is adapted from EducateOS's
// `verifyFindings` (`@educateos/assessment-ai`, Apache-2.0).
import { z } from "zod";
import { Id, Uncertainty, type Activity, type Artifact, type Criterion } from "./schemas";

/**
 * Extracts the JSON object from a model's text. Accepts a bare object or one inside a Markdown code
 * fence; anything else is `undefined`. The result is still untrusted.
 */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

/** One excerpt as a model must cite it: the exact text, and optionally its [start, end) range. */
export const ExcerptOutput = z.strictObject({
  artifact: Id,
  quote: z.string().min(1).max(1000),
  start: z.int().nonnegative().optional(),
  end: z.int().positive().optional(),
});
export type ExcerptOutput = z.infer<typeof ExcerptOutput>;

/**
 * One finding as the model must return it. There is no field for points, a grade, a score or an
 * approval, and a finding carrying one is dropped (see {@link FORBIDDEN_FIELDS}).
 */
export const FindingOutput = z.strictObject({
  criterionId: Id,
  observation: z.string().trim().min(1).max(800),
  /** Teacher-only reasoning, kept apart from the student-facing observation. */
  rationale: z.string().trim().min(1).max(800).optional(),
  suggestedLevel: Id.optional(),
  excerpts: z.array(ExcerptOutput).min(1).max(10),
  uncertainty: Uncertainty,
});
export type FindingOutput = z.infer<typeof FindingOutput>;

/** Keys that would let a model assign a grade or approve its own output. Their presence drops a finding. */
export const FORBIDDEN_FIELDS = ["score", "grade", "points", "mark", "approved", "approval", "release", "released", "final"] as const;

/** A verified excerpt: exactly the submitted text at `[start, end)`, in UTF-16 code units. */
export interface VerifiedExcerpt {
  artifactId: string;
  start: number;
  end: number;
  quote: string;
  /** `exact`: the model's range matched. `located`: the quote was found in the work at another or no range. */
  anchoring: "exact" | "located";
}

/** Why a model's finding was dropped. Its content is not kept. */
export const DropReason = z.enum([
  "invalid-schema",
  "forbidden-field",
  "unknown-criterion",
  "unselected-criterion",
  "deprioritized-criterion",
  "unknown-level",
  "unknown-artifact",
  "quote-not-found",
  "range-mismatch",
  "duplicate",
]);
export type DropReason = z.infer<typeof DropReason>;

/** A dropped finding: the reason, and the criterion when it was a known one. */
export interface Dropped {
  reason: DropReason;
  criterionId?: string;
}

/**
 * How excerpt ranges are checked.
 * - `locate` (default): the quote must occur exactly in the work. If the model's range is missing
 *   or wrong, the excerpt is re-anchored to the quote's first occurrence and marked `located`.
 * - `strict`: the model's range must be given and must hold exactly the quote, as in EducateOS.
 */
export type RangePolicy = "locate" | "strict";

/**
 * Checks one excerpt against the work. Returns the verified excerpt, or why it failed. A quote is
 * never fuzzy-matched: it must be exactly the student's text, character for character.
 */
export function verifyExcerpt(excerpt: ExcerptOutput, artifacts: readonly Artifact[], policy: RangePolicy): VerifiedExcerpt | DropReason {
  const artifact = artifacts.find((a) => a.id === excerpt.artifact) ?? (artifacts.length === 1 ? artifacts[0] : undefined);
  if (artifact === undefined) return "unknown-artifact";
  const { quote } = excerpt;
  const hasRange = excerpt.start !== undefined && excerpt.end !== undefined;
  if (hasRange && excerpt.end! <= artifact.text.length && artifact.text.slice(excerpt.start, excerpt.end) === quote) {
    return { artifactId: artifact.id, start: excerpt.start!, end: excerpt.end!, quote, anchoring: "exact" };
  }
  const at = artifact.text.indexOf(quote);
  if (at < 0) return "quote-not-found";
  if (policy === "strict") return "range-mismatch";
  return { artifactId: artifact.id, start: at, end: at + quote.length, quote, anchoring: "located" };
}

/** A verified finding, always labelled `ai-suggested`. */
export interface Finding {
  id: string;
  source: "ai-suggested";
  criterionId: string;
  /** The student-facing text. */
  observation: string;
  /** Teacher-only reasoning; never shown to a student. */
  rationale?: string;
  /** Teacher-only: never shown to a student. */
  suggestedLevelId?: string;
  excerpts: VerifiedExcerpt[];
  uncertainty: Uncertainty;
}

/** What verifying one model output came to. */
export interface VerifiedFindings {
  /** Whether the output was a JSON object with a `findings` array. */
  parsed: boolean;
  findings: Finding[];
  dropped: Dropped[];
  /** How many excerpts carried a range that did not match (counted even when re-anchored). */
  misplacedRanges: number;
}

function hasForbiddenField(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  return Object.keys(value).some((k) => (FORBIDDEN_FIELDS as readonly string[]).includes(k.toLowerCase()));
}

/** Text reduced to lowercase words, for comparing findings: punctuation and spacing are ignored. */
export function normaliseText(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/[^\p{L}\p{N}']+/gu, " ").trim();
}

/**
 * Whether two texts are the same or nearly so: equal once normalised, or sharing at least 90% of
 * their distinct words (Jaccard) when both have five or more.
 */
export function nearlyIdentical(a: string, b: string): boolean {
  const na = normaliseText(a);
  const nb = normaliseText(b);
  if (na === nb) return na.length > 0;
  const wa = new Set(na.split(" "));
  const wb = new Set(nb.split(" "));
  if (wa.size < 5 || wb.size < 5) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / (wa.size + wb.size - shared) >= 0.9;
}

/**
 * Whether `text` repeats `other`: nearly identical to it, or containing any of its sentences of
 * 24 or more characters word for word (after normalising).
 */
export function repeatsText(text: string, other: string): boolean {
  if (nearlyIdentical(text, other)) return true;
  const hay = ` ${normaliseText(text)} `;
  return other.split(/(?<=[.!?])\s+/).some((sentence) => {
    const n = normaliseText(sentence);
    return n.length >= 24 && hay.includes(` ${n} `);
  });
}

/**
 * Keeps only findings that pass every check: valid shape, no grading field, a criterion the
 * teacher selected and has not deprioritized, a level that criterion has, every excerpt exactly in
 * the work, and an observation that does not repeat one already kept (on any criterion). A finding
 * is dropped whole when any check fails.
 */
export function verifyFindings(
  raw: unknown,
  input: {
    activity: Activity;
    artifacts: readonly Artifact[];
    criteria: readonly Criterion[];
    /** Selected criteria whose findings are dropped because the teacher keeps rejecting them. */
    deprioritized?: readonly string[];
    /** Drop findings whose observation repeats one already kept. Default true. */
    dedupe?: boolean;
  },
  policy: RangePolicy = "locate",
): VerifiedFindings {
  const list = typeof raw === "object" && raw !== null && Array.isArray((raw as { findings?: unknown }).findings)
    ? (raw as { findings: unknown[] }).findings
    : undefined;
  if (list === undefined) return { parsed: false, findings: [], dropped: [], misplacedRanges: 0 };
  const findings: Finding[] = [];
  const dropped: Dropped[] = [];
  let misplacedRanges = 0;
  for (const item of list.slice(0, 100)) {
    if (hasForbiddenField(item)) {
      dropped.push({ reason: "forbidden-field" });
      continue;
    }
    const parsed = FindingOutput.safeParse(item);
    if (!parsed.success) {
      dropped.push({ reason: "invalid-schema" });
      continue;
    }
    const f = parsed.data;
    const criterion = input.activity.rubric.criteria.find((c) => c.id === f.criterionId);
    if (criterion === undefined) {
      dropped.push({ reason: "unknown-criterion" });
      continue;
    }
    if (input.deprioritized?.includes(criterion.id)) {
      dropped.push({ reason: "deprioritized-criterion", criterionId: criterion.id });
      continue;
    }
    if (!input.criteria.some((c) => c.id === criterion.id)) {
      dropped.push({ reason: "unselected-criterion", criterionId: criterion.id });
      continue;
    }
    if (f.suggestedLevel !== undefined && !criterion.levels.some((l) => l.id === f.suggestedLevel)) {
      dropped.push({ reason: "unknown-level", criterionId: criterion.id });
      continue;
    }
    const excerpts: VerifiedExcerpt[] = [];
    let failure: DropReason | undefined;
    for (const e of f.excerpts) {
      const v = verifyExcerpt(e, input.artifacts, policy);
      if (typeof v === "string") {
        failure = v;
        break;
      }
      if (e.start !== undefined && v.anchoring === "located") misplacedRanges++;
      excerpts.push(v);
    }
    if (failure !== undefined) {
      dropped.push({ reason: failure, criterionId: criterion.id });
      continue;
    }
    // The same words under two criteria would let one copy reach the student after the teacher
    // rejected the other; the first copy is kept.
    if (input.dedupe !== false && findings.some((k) => nearlyIdentical(k.observation, f.observation))) {
      dropped.push({ reason: "duplicate", criterionId: criterion.id });
      continue;
    }
    findings.push({
      id: `f${findings.length + 1}`,
      source: "ai-suggested",
      criterionId: criterion.id,
      observation: f.observation,
      ...(f.rationale === undefined ? {} : { rationale: f.rationale }),
      ...(f.suggestedLevel === undefined ? {} : { suggestedLevelId: f.suggestedLevel }),
      excerpts,
      uncertainty: f.uncertainty,
    });
  }
  return { parsed: true, findings, dropped, misplacedRanges };
}
