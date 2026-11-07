// Routes for Phase 2: teacher goals with dry runs and monitoring (Task 4), and language and
// reading-level variants of released feedback.
import { approveVariant, createGoal, draftVariant, dryRunGoal, evaluateGoal, goalReport, recordGoalJudgement, type GoalEvaluator } from "@teacher-gate/core";
import type { Route } from "./server";

/** The Phase 2 routes. `evaluators` are extra goal evaluators, e.g. Learning Commons ones. */
export function phase2Routes(evaluators: readonly GoalEvaluator[] = []): Route[] {
  return [
    async (gate, { method, path, query, body, actor }) => {
      const [a, b, c, d] = path;
      if (a === "goals") {
        if (b === undefined && method === "POST") return createGoal(gate, actor, body, evaluators);
        if (b !== undefined && c === "dry-run" && method === "POST") return dryRunGoal(gate, actor, b, ((body ?? {}) as { submissions?: unknown[] }).submissions ?? [], evaluators);
        if (b !== undefined && c === "evaluations" && method === "POST") return evaluateGoal(gate, actor, b, body, evaluators);
        if (b !== undefined && c === "judgements" && method === "POST") {
          const { submissionId, met } = (body ?? {}) as { submissionId?: string; met?: boolean };
          return recordGoalJudgement(gate, actor, b, String(submissionId ?? ""), met === true);
        }
        if (b !== undefined && c === "report" && method === "GET") {
          const opts: { windowDays?: number; driftThreshold?: number; minPairs?: number } = {};
          if (query.get("windowDays")) opts.windowDays = Number(query.get("windowDays"));
          if (query.get("driftThreshold")) opts.driftThreshold = Number(query.get("driftThreshold"));
          if (query.get("minPairs")) opts.minPairs = Number(query.get("minPairs"));
          return goalReport(gate, actor, b, opts);
        }
      }
      if (a === "drafts" && b !== undefined && c === "variants") {
        if (d === undefined && method === "POST") return draftVariant(gate, actor, b, body);
        if (d !== undefined && path[4] === "approve" && method === "POST") return approveVariant(gate, actor, b, d);
      }
      return undefined;
    },
  ];
}
