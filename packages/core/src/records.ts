// The records Teacher Gate keeps: drafts, the teacher's decisions, releases and the audit log.
// None of them identifies a student beyond the caller's opaque `learnerRef`, and audit records never
// hold student text.
import type { TokenUsage } from "./model";
import type { Dropped, Finding } from "./verify";

/**
 * Who is acting. Only a `teacher` acting on the `direct` channel (in the developer's own product,
 * signed in) can decide on or release AI output. Agents, including the MCP server, can draft and
 * read, never decide or release.
 */
export interface Actor {
  id: string;
  role: "teacher" | "agent" | "student" | "service";
  channel: "direct" | "agent" | "api";
}

/** A preference the context builder applied to a draft, shown to the teacher (Task 3). */
export interface AppliedPreference {
  id: string;
  kind: "focus-criteria" | "instructions" | "deprioritized-criterion" | "edit-example";
  source: "guidance" | "past-decisions";
  description: string;
}

/** What the context builder put in front of the model, without any student text. */
export interface ContextReport {
  criteria: string[];
  objectives: number;
  misconceptions: string[];
  instructionChars: number;
  workChars: number;
}

/** Why a draft was not produced. */
export type SkipReason = "ai-help-policy" | "no-text" | "input-too-large" | "moderation";

/** A draft of AI feedback on one submission (Task 1). Everything in it is a suggestion. */
export interface FeedbackDraft {
  id: string;
  kind: "feedback";
  activityId: string;
  submissionId: string;
  learnerRef: string;
  createdAt: string;
  requestedBy: Actor;
  model: string;
  status: "completed" | "skipped" | "invalid-output" | "failed";
  skipReason?: SkipReason;
  findings: Finding[];
  dropped: Dropped[];
  misplacedRanges: number;
  appliedPreferences: AppliedPreference[];
  context?: ContextReport;
  usage?: TokenUsage;
}

/** A teacher's decision on one finding. The latest for a finding is the one in force. */
export interface DecisionRecord {
  id: string;
  draftId: string;
  activityId: string;
  findingId: string;
  criterionId: string;
  decision: "accept" | "edit" | "reject";
  /** The model's observation, kept so later drafts can learn from the edit. */
  originalObservation: string;
  /** The teacher's text, for `edit`. */
  editedObservation?: string;
  /** The level the teacher chose, if any. Teacher-only. */
  levelId?: string;
  reason?: string;
  decidedBy: string;
  decidedAt: string;
}

/** One finding as released to a student: the teacher-approved text and its evidence. */
export interface ReleasedFinding {
  findingId: string;
  criterionId: string;
  criterionTitle: string;
  text: string;
  excerpts: { artifactId: string; start: number; end: number; quote: string }[];
}

/** A version of released feedback in another language or at another reading level. */
export interface ReleaseVariant {
  id: string;
  language?: string;
  readingLevel?: number;
  findings: { findingId: string; text: string }[];
  model: string;
  createdAt: string;
  /** A variant reaches the student only after a teacher approves it. */
  approvedBy?: string;
  approvedAt?: string;
}

/**
 * A teacher's release of a draft to the student. It is a snapshot: exactly the accepted and edited
 * findings, in the teacher's words, and nothing else.
 */
export interface ReleaseRecord {
  draftId: string;
  submissionId: string;
  activityId: string;
  learnerRef: string;
  releasedBy: string;
  releasedAt: string;
  findings: ReleasedFinding[];
  variants: ReleaseVariant[];
}

/** One audit entry. It records who did what to which record, never student text. */
export interface AuditRecord {
  seq: number;
  at: string;
  action: string;
  actor: Actor;
  outcome: "allowed" | "denied";
  /** IDs only: draft, finding, submission, goal or brief. */
  subject: Record<string, string>;
  reason?: string;
}
