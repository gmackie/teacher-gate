// The Teacher Gate MCP server. It exposes review-safe tools only: an agent can draft feedback and
// misconception briefs and read them back, and every result is a suggestion a teacher must review.
// There is deliberately no tool that decides, releases, saves a brief, changes preferences, puts
// activities or reads the student view; those belong to a teacher acting directly in the product.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ClassSet, GateError, Id, Misconception, Submission } from "@teacher-gate/core";
import { z } from "zod";
import { BackendError, type TeacherGateBackend } from "./backend";

/** The names of every tool the server registers, in order. */
export const TOOL_NAMES = ["get_activity", "draft_feedback", "get_draft", "list_drafts", "draft_misconception_brief", "get_brief", "get_preferences"] as const;

const REVIEW = "The result is a suggestion that a teacher must review; it is not final feedback or a grade, and you cannot decide on or release it.";

/** A tool result as JSON text. */
function ok(value: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

/** An error result carrying only the error's message, never a stack trace or internals. */
function fail(error: unknown): CallToolResult {
  const message = error instanceof GateError || error instanceof BackendError ? `${error.code}: ${error.message}` : "Internal error.";
  return { isError: true, content: [{ type: "text", text: message }] };
}

async function run(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return ok(await fn());
  } catch (error) {
    return fail(error);
  }
}

/** Options for {@link createMcpServer}. */
export interface McpServerOptions {
  name?: string;
  version?: string;
}

/** Creates the MCP server over a backend. Connect it to a transport (stdio, in-memory) to serve. */
export function createMcpServer(backend: TeacherGateBackend, options: McpServerOptions = {}): McpServer {
  const server = new McpServer(
    { name: options.name ?? "teacher-gate", version: options.version ?? "0.1.0" },
    { instructions: `Teacher Gate keeps teachers in control of AI formative feedback. These tools draft and read only. ${REVIEW} Hand drafts to the teacher; never tell a student a grade or present a draft as final.` },
  );
  const read = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;
  const draft = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;

  server.registerTool(
    "get_activity",
    {
      title: "Get activity",
      description: `Reads an activity: its prompt, rubric, AI-help policy and the teacher's guidance. Use it to understand what feedback should address. Any feedback you draft from it is a suggestion that a teacher must review.`,
      inputSchema: { activityId: Id },
      annotations: read,
    },
    ({ activityId }) => run(() => backend.getActivity(activityId)),
  );

  server.registerTool(
    "draft_feedback",
    {
      title: "Draft rubric feedback",
      description: `Drafts AI rubric feedback on one student submission. Findings are verified against the rubric and quote the student's work exactly. ${REVIEW} A policy of "none", empty or oversized work gives a "skipped" draft.`,
      inputSchema: { submission: Submission },
      annotations: draft,
    },
    ({ submission }) => run(() => backend.draftFeedback(submission)),
  );

  server.registerTool(
    "get_draft",
    {
      title: "Get feedback draft",
      description: `Reads the teacher's view of a feedback draft: each finding, its evidence, any decision the teacher has made, and flags on text that states a grade. ${REVIEW}`,
      inputSchema: { draftId: z.string().min(1).max(128) },
      annotations: read,
    },
    ({ draftId }) => run(() => backend.getDraft(draftId)),
  );

  server.registerTool(
    "list_drafts",
    {
      title: "List feedback drafts",
      description: `Lists feedback drafts, optionally for one activity or submission. ${REVIEW}`,
      inputSchema: { activityId: Id.optional(), submissionId: Id.optional() },
      annotations: read,
    },
    ({ activityId, submissionId }) => run(() => backend.listDrafts({ ...(activityId === undefined ? {} : { activityId }), ...(submissionId === undefined ? {} : { submissionId }) })),
  );

  server.registerTool(
    "draft_misconception_brief",
    {
      title: "Draft class misconception brief",
      description: `Drafts a misconception brief for a class set of responses to one item: which responses show which known misconceptions, with exact quotes. Pass a misconception catalog, or omit it to use the service's. ${REVIEW} The teacher confirms, rejects or reassigns every mapping before the brief is saved.`,
      inputSchema: { classSet: ClassSet, catalog: z.array(Misconception).max(500).optional() },
      annotations: draft,
    },
    ({ classSet, catalog }) => run(() => backend.draftMisconceptionBrief(classSet, catalog)),
  );

  server.registerTool(
    "get_brief",
    {
      title: "Get misconception brief",
      description: `Reads a misconception brief: its mappings, the teacher's decisions so far, the mappings still open and, once the teacher saves it, the saved brief. Unconfirmed mappings are a suggestion that a teacher must review.`,
      inputSchema: { briefId: z.string().min(1).max(128) },
      annotations: read,
    },
    ({ briefId }) => run(() => backend.getBrief(briefId)),
  );

  server.registerTool(
    "get_preferences",
    {
      title: "Get feedback preferences",
      description: `Reads the preferences a new draft on an activity would apply (the teacher's guidance and lessons from past decisions). Only the teacher can change them. Drafts shaped by them are still a suggestion that a teacher must review.`,
      inputSchema: { activityId: Id },
      annotations: read,
    },
    ({ activityId }) => run(() => backend.getPreferences(activityId)),
  );

  return server;
}
