import { afterEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { TeacherGate, type Actor, type Misconception } from "@teacher-gate/core";
import { ScriptedModel } from "@teacher-gate/core/testing";
import { createServer } from "@teacher-gate/server";
import { AGENT_ACTOR, createMcpServer, HttpBackend, InProcessBackend, TOOL_NAMES, type TeacherGateBackend } from "../src";

const teacher: Actor = { id: "t-1", role: "teacher", channel: "direct" };
const activity = {
  id: "act-1",
  title: "Ice melting",
  aiHelp: "releasable" as const,
  standards: ["MS-PS3-3"],
  rubric: { id: "r", title: "R", criteria: [{ id: "evidence", title: "Evidence", levels: [{ id: "low", label: "Low" }, { id: "high", label: "High" }] }] },
};
const submission = { id: "s1", activityId: "act-1", learnerRef: "L1", artifacts: [{ id: "a1", text: "It melted in 4 minutes." }] };
const feedbackReply = JSON.stringify({ findings: [{ criterionId: "evidence", observation: "Uses a measurement.", excerpts: [{ artifact: "a1", quote: "melted in 4 minutes" }], uncertainty: "low" }] });
const catalog: Misconception[] = [{ id: "cold-flows", title: "Cold flows into warm objects", description: "Thinks coldness moves.", standards: ["MS-PS3-3"] }];
const classSet = {
  id: "cs-1",
  item: { id: "q1", prompt: "Why does ice melt faster on metal?", standards: ["MS-PS3-3"] },
  responses: [{ id: "r1", learnerRef: "L1", text: "The cold goes into the ice." }],
};
const briefReply = JSON.stringify({ mappings: [{ responseId: "r1", misconceptionId: "cold-flows", quote: "The cold goes into the ice.", uncertainty: "low" }], strengths: [] });

function scripted() {
  return new ScriptedModel((req) => (req.system.includes("class set") ? briefReply : feedbackReply));
}

async function connect(backend: TeacherGateBackend) {
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await createMcpServer(backend).connect(serverT);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientT);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content: { type: string; text: string }[] };
    const text = r.content[0]!.text;
    return { isError: r.isError === true, text, json: r.isError ? undefined : (JSON.parse(text) as any) };
  };
  return { client, call };
}

async function inProcess() {
  const gate = new TeacherGate({ model: scripted() });
  await gate.putActivity(teacher, activity);
  return { gate, ...(await connect(new InProcessBackend(gate, catalog))) };
}

let http: Server | undefined;
afterEach(() => http?.close());

describe("Teacher Gate MCP server", () => {
  it("registers exactly the review-safe tools, none of which can decide or release", async () => {
    const { client } = await inProcess();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toEqual([...TOOL_NAMES]);
    expect(names).toEqual(["get_activity", "draft_feedback", "get_draft", "list_drafts", "draft_misconception_brief", "get_brief", "get_preferences"]);
    for (const n of names) expect(n).not.toMatch(/release|decide|save|approve|put|set|student/);
    for (const t of tools) expect(t.description).toMatch(/suggestion that a teacher must review/);
  });

  it("drafts and reads feedback, briefs and preferences as the agent actor", async () => {
    const { gate, call } = await inProcess();
    expect((await call("get_activity", { activityId: "act-1" })).json.title).toBe("Ice melting");

    const draft = await call("draft_feedback", { submission });
    expect(draft.isError).toBe(false);
    expect(draft.json.status).toBe("completed");
    expect(draft.json.requestedBy).toEqual(AGENT_ACTOR);

    const view = await call("get_draft", { draftId: draft.json.id });
    expect(view.json.view).toBe("teacher");
    expect(view.json.findings.map((f: { observation: string }) => f.observation)).toEqual(["Uses a measurement."]);
    expect(view.json.released).toBe(false);

    expect((await call("list_drafts", { activityId: "act-1" })).json.map((d: { id: string }) => d.id)).toEqual([draft.json.id]);
    expect((await call("list_drafts", { submissionId: "other" })).json).toEqual([]);

    const brief = await call("draft_misconception_brief", { classSet });
    expect(brief.json.mappings.map((m: { misconceptionId: string }) => m.misconceptionId)).toEqual(["cold-flows"]);
    const state = await call("get_brief", { briefId: brief.json.id });
    expect(state.json.open).toEqual(["m1"]);
    expect(state.json.saved).toBeUndefined();

    expect((await call("get_preferences", { activityId: "act-1" })).json).toHaveProperty("applied");

    const actions = (await gate.auditLog(teacher)).filter((a) => a.actor.role === "agent").map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["draft.create", "draft.read", "brief.create"]));
  });

  it("returns errors as isError results with the message only", async () => {
    const { call } = await inProcess();
    const missing = await call("get_draft", { draftId: "nope" });
    expect(missing).toMatchObject({ isError: true, text: "not-found: Draft nope was not found." });
    const bad = await call("draft_feedback", { submission: { ...submission, activityId: "missing" } });
    expect(bad.isError).toBe(true);
    expect(bad.text).not.toMatch(/\bat .*\.ts:\d+/);
  });

  it("an agent actor cannot release or decide even with an in-process gate", async () => {
    const { gate } = await inProcess();
    const draft = await gate.draftFeedback(AGENT_ACTOR, submission);
    await expect(gate.decide(AGENT_ACTOR, draft.id, { findingId: "f1", decision: "accept" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(gate.release(AGENT_ACTOR, draft.id)).rejects.toMatchObject({ code: "forbidden" });
    // Even an agent claiming the teacher role is refused off the direct channel.
    await expect(gate.release({ id: "t-1", role: "teacher", channel: "agent" }, draft.id)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("works over HTTP with an agent token, which the service forces onto the agent channel", async () => {
    const gate = new TeacherGate({ model: scripted() });
    await gate.putActivity(teacher, activity);
    http = createServer(gate, { tokens: new Map([["agt", "agent"]]), misconceptions: catalog });
    await new Promise<void>((r) => http!.listen(0, r));
    const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
    const { call } = await connect(new HttpBackend({ url, agentToken: "agt", agentId: "claude" }));

    const draft = await call("draft_feedback", { submission });
    expect(draft.json.requestedBy).toEqual({ id: "claude", role: "agent", channel: "agent" });
    expect((await call("get_draft", { draftId: draft.json.id })).json.findings).toHaveLength(1);
    expect((await call("list_drafts", {})).json).toHaveLength(1);
    expect((await call("get_activity", { activityId: "act-1" })).json.id).toBe("act-1");
    expect((await call("get_preferences", { activityId: "act-1" })).json).toHaveProperty("applied");
    const brief = await call("draft_misconception_brief", { classSet });
    expect((await call("get_brief", { briefId: brief.json.id })).json.open).toEqual(["m1"]);
    expect(await call("get_draft", { draftId: "nope" })).toMatchObject({ isError: true, text: "not-found: Draft nope was not found." });

    // Defence in depth: the token itself cannot release, whatever the MCP server exposes.
    const res = await fetch(`${url}/v1/drafts/${draft.json.id}/release`, { method: "POST", headers: { authorization: "Bearer agt", "x-actor-role": "teacher", "x-actor-id": "t-1" } });
    expect(res.status).toBe(403);

    const bad = await connect(new HttpBackend({ url, agentToken: "wrong" }));
    expect((await bad.call("list_drafts", {})).isError).toBe(true);
  });
});
