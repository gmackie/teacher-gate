// The data Teacher Gate reads and writes. Every external input is parsed with these schemas; nothing
// from a caller or a model is trusted until it has been.
import { z } from "zod";

/** An identifier a caller chooses: letters, digits and `._:-`, at most 128 characters. */
export const Id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/, "expected an identifier of letters, digits and ._:-");
export type Id = z.infer<typeof Id>;

/** One level of a rubric criterion. Levels are listed from lowest to highest. */
export const Level = z.strictObject({
  id: Id,
  label: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  points: z.number().nonnegative().optional(),
});
export type Level = z.infer<typeof Level>;

/** One rubric criterion. */
export const Criterion = z.strictObject({
  id: Id,
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  levels: z.array(Level).min(1).max(20),
});
export type Criterion = z.infer<typeof Criterion>;

/** A teacher's rubric. */
export const Rubric = z.strictObject({
  id: Id,
  title: z.string().min(1).max(200),
  criteria: z.array(Criterion).min(1).max(50),
});
export type Rubric = z.infer<typeof Rubric>;

/**
 * How much AI help an activity allows on students' work:
 * - `none`: no model reads the work; drafts are skipped.
 * - `teacher-only`: AI findings are advice to the teacher and can never be released to the student.
 * - `releasable`: the teacher may release reviewed findings to the student.
 */
export const AiHelpPolicy = z.enum(["none", "teacher-only", "releasable"]);
export type AiHelpPolicy = z.infer<typeof AiHelpPolicy>;

/**
 * What a teacher sets per activity (Task 3): which criteria AI feedback addresses, their own
 * instructions, and the reading level and language student-facing feedback is delivered in.
 */
export const TeacherGuidance = z.strictObject({
  criteria: z.array(Id).min(1).max(50).optional(),
  instructions: z.string().trim().min(1).max(4000).optional(),
  /** US grade level (1–12) student-facing feedback is rewritten to after release. */
  readingLevel: z.int().min(1).max(12).optional(),
  /** BCP 47 language tag student-facing feedback is translated to after release, e.g. `es`. */
  language: z.string().regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/).optional(),
  /** Whether the teacher's past edits and rejections steer new drafts. Defaults to true. */
  learnFromDecisions: z.boolean().optional(),
});
export type TeacherGuidance = z.infer<typeof TeacherGuidance>;

/** A known misconception, from a misconception map such as a public good's. */
export const Misconception = z.strictObject({
  id: Id,
  title: z.string().min(1).max(300),
  description: z.string().max(4000),
  /** Standards the misconception relates to, as identifiers from the caller's framework. */
  standards: z.array(z.string().min(1).max(200)).max(50).optional(),
  /** What a response showing it tends to say. */
  indicators: z.array(z.string().min(1).max(500)).max(20).optional(),
  /** Where the entry came from, e.g. `learning-commons:eedi` or `synthetic:teacher-gate`. */
  source: z.string().max(200).optional(),
});
export type Misconception = z.infer<typeof Misconception>;

/** An activity: what students were asked to do, the rubric, and the teacher's AI settings. */
export const Activity = z.strictObject({
  id: Id,
  title: z.string().min(1).max(300),
  /** What students were asked to do. */
  prompt: z.string().max(8000).optional(),
  /** The learning objectives this activity addresses. */
  objectives: z.array(z.string().min(1).max(1000)).max(20).optional(),
  /** Standards the activity addresses; used to pick relevant misconceptions. */
  standards: z.array(z.string().min(1).max(200)).max(50).optional(),
  rubric: Rubric,
  aiHelp: AiHelpPolicy,
  guidance: TeacherGuidance.optional(),
});
export type Activity = z.infer<typeof Activity>;

/** One piece of submitted text. */
export const Artifact = z.strictObject({
  id: Id,
  text: z.string().max(2_000_000),
  label: z.string().max(200).optional(),
});
export type Artifact = z.infer<typeof Artifact>;

/**
 * A student's submission. `learnerRef` is an opaque reference the developer's product chooses;
 * Teacher Gate never needs a name or other identifying detail.
 */
export const Submission = z.strictObject({
  id: Id,
  activityId: Id,
  learnerRef: Id,
  artifacts: z.array(Artifact).min(1).max(20),
});
export type Submission = z.infer<typeof Submission>;

/** How sure the model says it is of a finding. */
export const Uncertainty = z.enum(["low", "medium", "high"]);
export type Uncertainty = z.infer<typeof Uncertainty>;
