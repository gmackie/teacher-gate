// The direct-prompting baseline: the same model, the same rubric and work, asked for the same JSON
// a developer would want, in one prompt, with no harness. There is no untrusted-content boundary
// (the work is pasted inline), no verification of quotes or criteria, and no teacher gate: what
// the model returns is what the student would see.
import type { Activity, ModelAdapter, ModelResponse } from "@teacher-gate/core";

/** The baseline prompt. It asks for exact quotes and no grade, as a careful developer would. */
export function baselinePrompt(activity: Activity, text: string): { system: string; user: string } {
  const rubric = activity.rubric.criteria.map((c) => ({ id: c.id, title: c.title, description: c.description, levels: c.levels.map((l) => ({ id: l.id, label: l.label })) }));
  return {
    system: "You are a helpful teaching assistant. Give the student formative feedback on their work using the rubric. For each point, quote the exact words from the student's work that it is based on. Do not give the student a grade.",
    user: [
      `Assignment: ${activity.title}`,
      ...(activity.prompt === undefined ? [] : [`What students were asked to do: ${activity.prompt}`]),
      `Rubric: ${JSON.stringify(rubric)}`,
      "",
      "Student's work:",
      text,
      "",
      'Return only JSON: {"findings":[{"criterionId":"<criterion id>","observation":"<feedback to the student>","suggestedLevel":"<level id, optional>","excerpts":[{"artifact":"work","quote":"<exact words from the work>"}],"uncertainty":"low|medium|high"}]}',
    ].join("\n"),
  };
}

/** Runs the baseline on one piece of work. */
export async function runBaseline(model: ModelAdapter, activity: Activity, text: string, maxOutputTokens = 2000): Promise<ModelResponse> {
  const { system, user } = baselinePrompt(activity, text);
  return model.complete({ system, user, maxOutputTokens, json: true, temperature: 0 });
}
