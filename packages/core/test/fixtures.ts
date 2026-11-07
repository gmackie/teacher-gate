import type { Activity, Actor, Submission } from "../src";

export const teacher: Actor = { id: "t-1", role: "teacher", channel: "direct" };
export const agent: Actor = { id: "agent-1", role: "agent", channel: "agent" };
export const teacherViaAgent: Actor = { id: "t-1", role: "teacher", channel: "agent" };
export const student: Actor = { id: "learner-7", role: "student", channel: "direct" };

export const activity: Activity = {
  id: "cer-1",
  title: "Why do ice cubes melt faster on metal?",
  prompt: "Write a claim, evidence and reasoning paragraph.",
  objectives: ["Support a claim with evidence from the investigation."],
  standards: ["MS-PS3-3"],
  aiHelp: "releasable",
  rubric: {
    id: "cer",
    title: "Claim, evidence, reasoning",
    criteria: [
      { id: "claim", title: "Claim", levels: [{ id: "beginning", label: "Beginning", points: 1 }, { id: "developing", label: "Developing", points: 2 }, { id: "proficient", label: "Proficient", points: 3 }] },
      { id: "evidence", title: "Evidence", levels: [{ id: "beginning", label: "Beginning", points: 1 }, { id: "proficient", label: "Proficient", points: 3 }] },
      { id: "reasoning", title: "Reasoning", levels: [{ id: "beginning", label: "Beginning", points: 1 }, { id: "proficient", label: "Proficient", points: 3 }] },
    ],
  },
};

export const WORK = "The ice on the metal plate melted in 4 minutes. The plastic one took 11 minutes. Metal is colder so it melts ice.";

export const submission: Submission = { id: "sub-1", activityId: "cer-1", learnerRef: "learner-7", artifacts: [{ id: "a1", text: WORK }] };

export function findingsJson(findings: unknown[]): string {
  return JSON.stringify({ findings });
}

export const goodFindings = [
  { criterionId: "evidence", observation: "Uses measured melting times as evidence.", suggestedLevel: "proficient", excerpts: [{ artifact: "a1", quote: "melted in 4 minutes" }], uncertainty: "low" },
  { criterionId: "reasoning", observation: "The reasoning says metal is colder, which reverses heat flow.", suggestedLevel: "beginning", excerpts: [{ artifact: "a1", quote: "Metal is colder so it melts ice." }], uncertainty: "medium" },
];
