// Learning Commons Evaluators (prompts and settings CC BY 4.0; code MIT): binary judges of written
// feedback on grade 6–12 ELA writing, built on Quill and Leanlab's Productive Coaching rubric. The
// prompts are fetched at a pinned commit and checked against the SHA-256 each evaluator's
// config.json declares, then run through any Teacher Gate model adapter.
//
// Deviation from the source, stated wherever results are reported: Learning Commons validated
// these prompts with OpenAI gpt-5.4 at temperature 1 on Quill "because" completions; Teacher Gate
// runs them with the caller's judge model, which has not been validated against their labels.
import { readFileSync } from "node:fs";
import type { ModelAdapter } from "@teacher-gate/core";
import { extractJson } from "@teacher-gate/core";
import { cachedDownload, sha256 } from "./download";

/** The pinned commit of github.com/learning-commons-org/evaluators. */
export const LC_EVALUATORS_COMMIT = "e1b5dfb4631ffff37819e18d040efca04506bb5d";

/** The feedback evaluators available (directory names under evals/feedback/ela-writing). */
export const LC_FEEDBACK_EVALUATORS = [
  "student-response-specificity",
  "revision-actionability",
  "revision-accuracy",
  "revision-manageability",
  "strength-acknowledgment",
  "tone-appropriateness",
  "withholding-answers",
] as const;
export type LcFeedbackEvaluatorId = (typeof LC_FEEDBACK_EVALUATORS)[number];

/** A loaded evaluator: its identity and verified prompts. */
export interface LcEvaluator {
  id: LcFeedbackEvaluatorId;
  stableId: string;
  name: string;
  description: string;
  system: string;
  user: string;
  /** The evaluator's output JSON Schema, sent as structured output as Learning Commons' runner does. */
  outputSchema: Record<string, unknown>;
}

interface LcConfig {
  evaluator: { id: string; stable_id: string; name: string; description: string };
  steps: { prompt: { messages: { role: string; source_path: string; sha256: string }[] } }[];
}

/** Downloads (once) and verifies one evaluator's prompts. */
export async function loadLcEvaluator(id: LcFeedbackEvaluatorId): Promise<LcEvaluator> {
  const base = `https://raw.githubusercontent.com/learning-commons-org/evaluators/${LC_EVALUATORS_COMMIT}/evals/feedback/ela-writing/${id}`;
  const dir = `lc-evaluators/${LC_EVALUATORS_COMMIT.slice(0, 12)}/${id}`;
  const config = JSON.parse(readFileSync(await cachedDownload(`${base}/config.json`, `${dir}/config.json`), "utf8")) as LcConfig;
  const prompts: Record<string, string> = {};
  for (const m of config.steps[0]!.prompt.messages) {
    const text = readFileSync(await cachedDownload(`${base}/${m.source_path}`, `${dir}/${m.source_path}`), "utf8");
    if (sha256(text) !== m.sha256) throw new Error(`Learning Commons evaluator ${id}: ${m.source_path} does not match its declared SHA-256.`);
    prompts[m.role] = text;
  }
  const outputSchema = JSON.parse(readFileSync(await cachedDownload(`${base}/output_schema.json`, `${dir}/output_schema.json`), "utf8")) as Record<string, unknown>;
  delete outputSchema.$schema;
  delete outputSchema.$id;
  return { outputSchema, id, stableId: config.evaluator.stable_id, name: config.evaluator.name, description: config.evaluator.description, system: prompts.system!, user: prompts.user! };
}

/** One judgement: 1 if the feedback meets the evaluator's criterion, 0 if not, null if unparseable. */
export interface LcJudgement {
  evaluator: LcFeedbackEvaluatorId;
  score: 0 | 1 | null;
  reasoning?: string;
}

/**
 * Runs an evaluator on one piece of feedback. Student work is placed where the evaluator's own
 * prompt puts it; the evaluator prompt is Learning Commons', unmodified apart from placeholders.
 */
export async function runLcEvaluator(model: ModelAdapter, evaluator: LcEvaluator, input: { studentText: string; feedbackText: string }): Promise<LcJudgement> {
  const user = evaluator.user.replace("{student_text}", input.studentText).replace("{feedback_text}", input.feedbackText);
  const res = await model.complete({ system: evaluator.system, user, maxOutputTokens: 1500, json: true, jsonSchema: evaluator.outputSchema });
  const out = extractJson(res.text) as { quality_score?: unknown; reasoning?: unknown } | undefined;
  const score = out?.quality_score === 0 || out?.quality_score === 1 ? out.quality_score : null;
  return { evaluator: evaluator.id, score, ...(typeof out?.reasoning === "string" ? { reasoning: out.reasoning.slice(0, 2000) } : {}) };
}
