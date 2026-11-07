// A Learning Commons feedback evaluator as a Teacher Gate goal evaluator (Task 4): a teacher goal
// about their feedback ("my feedback names a specific next step") is judged on the feedback
// released for each submission, by the Learning Commons prompt for that quality.
import type { GoalEvaluator, ModelAdapter } from "@teacher-gate/core";
import { runLcEvaluator, type LcEvaluator } from "./lc-evaluators";

/** Judges released feedback with a Learning Commons evaluator. No release means no judgement. */
export function lcGoalEvaluator(model: ModelAdapter, evaluator: LcEvaluator): GoalEvaluator {
  return {
    name: `learning-commons:${evaluator.id}`,
    target: "feedback",
    async judge(_goal, { submission, release }) {
      if (release === undefined || release.findings.length === 0) return { met: null, evidence: [], rationale: "No released feedback to judge." };
      const studentText = submission.artifacts.map((a) => a.text).join("\n\n");
      const feedbackText = release.findings.map((f) => `- ${f.text}`).join("\n");
      const j = await runLcEvaluator(model, evaluator, { studentText, feedbackText });
      return { met: j.score === null ? null : j.score === 1, evidence: [], ...(j.reasoning === undefined ? {} : { rationale: j.reasoning }) };
    },
  };
}
