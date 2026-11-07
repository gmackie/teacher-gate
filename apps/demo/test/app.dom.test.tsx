// @vitest-environment jsdom
// The demo page against a fake service: it seeds the activity, drafts, reviews and shows the
// student view, sending the headers a product backend would.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { teacherDraftView, type FeedbackDraft } from "@teacher-gate/core";
import { App } from "../src/App";
import { activity, submissions } from "../src/data";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("seeds the activity, drafts feedback and switches to the student view", async () => {
  const text = submissions[0]!.artifacts[0]!.text;
  const quote = "melted in 6 minutes";
  const start = text.indexOf(quote);
  const draft: FeedbackDraft = {
    id: "d1", kind: "feedback", activityId: activity.id, submissionId: submissions[0]!.id, learnerRef: "student-A", createdAt: "", requestedBy: { id: "demo-teacher", role: "teacher", channel: "direct" }, model: "fake", status: "completed",
    findings: [{ id: "f1", source: "ai-suggested", criterionId: "evidence", observation: "Gives measured times.", excerpts: [{ artifactId: "response", start, end: start + quote.length, quote, anchoring: "exact" }], uncertainty: "low" }],
    dropped: [], misplacedRanges: 0, appliedPreferences: [],
  };
  const calls: { method: string; url: string; role: string | undefined }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    calls.push({ method, url, role: (init.headers as Record<string, string> | undefined)?.["x-actor-role"] });
    const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });
    if (url === "/healthz") return json({ ok: true, model: "fake/model" });
    if (url.startsWith("/v1/activities/")) return json(activity);
    if (url === "/v1/drafts" && method === "POST") return json(draft, 201);
    if (url === "/v1/drafts/d1") return json(teacherDraftView(activity, draft, [], undefined));
    if (url.endsWith("/student-view")) return json({ view: "student", submissionId: draft.submissionId, findings: [] });
    return json({ error: "http", message: "Not found." }, 404);
  }));

  render(<App />);
  await screen.findByText("Connected. Model: fake/model.");
  fireEvent.click(screen.getByRole("button", { name: "Draft AI feedback" }));
  await screen.findByRole("heading", { name: "Finding 1: Evidence" });
  expect(document.querySelector("mark")?.textContent).toBe(quote);
  fireEvent.click(screen.getByRole("button", { name: "Student view (as student-A)" }));
  await screen.findByText("No feedback has been shared with you yet.");
  await waitFor(() => expect(calls.at(-1)).toMatchObject({ url: "/v1/submissions/demo-sub-1/student-view", role: "student" }));
  expect(calls.find((c) => c.method === "PUT")).toMatchObject({ url: `/v1/activities/${activity.id}`, role: "teacher" });
});
