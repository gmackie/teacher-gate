import { afterEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { TeacherGate } from "@teacher-gate/core";
import { ScriptedModel } from "@teacher-gate/core/testing";
import { createServer } from "../src";

const activity = {
  title: "Ice melting",
  aiHelp: "releasable",
  rubric: { id: "r", title: "R", criteria: [{ id: "evidence", title: "Evidence", levels: [{ id: "low", label: "Low" }, { id: "high", label: "High" }] }] },
};
const submission = { id: "s1", activityId: "act-1", learnerRef: "L1", artifacts: [{ id: "a1", text: "It melted in 4 minutes." }] };
const reply = JSON.stringify({ findings: [{ criterionId: "evidence", observation: "Uses a measurement.", excerpts: [{ artifact: "a1", quote: "melted in 4 minutes" }], uncertainty: "low" }] });

let server: Server | undefined;
afterEach(() => server?.close());

async function start() {
  const gate = new TeacherGate({ model: new ScriptedModel([reply]) });
  server = createServer(gate, { tokens: new Map([["prod", "product"], ["agt", "agent"]]) });
  await new Promise<void>((r) => server!.listen(0, r));
  const base = `http://127.0.0.1:${(server!.address() as AddressInfo).port}/v1`;
  const call = async (method: string, path: string, token: string, headers: Record<string, string>, body?: unknown) => {
    const res = await fetch(base + path, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: res.status, body: (await res.json()) as any };
  };
  return { call };
}
const teacher = { "x-actor-id": "t1", "x-actor-role": "teacher" };
const student = { "x-actor-id": "L1", "x-actor-role": "student" };

describe("HTTP service", () => {
  it("runs the whole flow for a product caller and refuses decisions from an agent token", async () => {
    const { call } = await start();
    expect((await call("PUT", "/activities/act-1", "prod", teacher, activity)).status).toBe(200);
    const draft = await call("POST", "/drafts", "agt", { "x-actor-role": "teacher", "x-actor-id": "t1" }, submission);
    expect(draft.status).toBe(201);
    const id = draft.body.id;
    // An agent token cannot pose as a teacher acting directly.
    expect((await call("POST", `/drafts/${id}/decisions`, "agt", teacher, { findingId: "f1", decision: "accept" })).status).toBe(403);
    expect((await call("POST", `/drafts/${id}/release`, "agt", teacher)).status).toBe(403);
    expect((await call("GET", `/drafts/${id}`, "prod", student)).status).toBe(403);
    expect((await call("POST", `/drafts/${id}/decisions`, "prod", teacher, { findingId: "f1", decision: "accept" })).status).toBe(201);
    expect((await call("POST", `/drafts/${id}/release`, "prod", teacher)).status).toBe(201);
    const view = await call("GET", "/submissions/s1/student-view", "prod", student);
    expect(view.body.findings).toEqual([{ criterion: "Evidence", text: "Uses a measurement.", evidence: [{ artifactId: "a1", start: 3, end: 22, quote: "melted in 4 minutes" }] }]);
  });

  it("rejects missing or unknown tokens and maps errors to statuses", async () => {
    const { call } = await start();
    expect((await call("GET", "/audit", "nope", teacher)).status).toBe(401);
    expect((await call("PUT", "/activities/x", "prod", teacher, { title: 1 })).status).toBe(400);
    expect((await call("GET", "/drafts/missing", "prod", teacher)).status).toBe(404);
    expect((await call("GET", "/audit", "prod", { "x-actor-id": "t1" })).status).toBe(400);
  });
});
