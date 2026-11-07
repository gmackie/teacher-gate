// A minimal Teacher Gate client, as a product backend would call the HTTP service. It runs the
// whole teacher-in-control loop on one synthetic CER paragraph from data/synthetic/cer-feedback.json:
// put the activity, draft feedback, read the teacher's view, accept / edit / reject each finding,
// release, then read what the student sees.
//
//   pnpm tsx examples/node-client/index.ts [item id, default syn-cer-01]
//
// Environment: TEACHER_GATE_URL (default http://localhost:8787) and TEACHER_GATE_TOKEN (a
// `product` token; omit it when the service runs with TEACHER_GATE_INSECURE_DEV=1).
// No dependencies: it uses Node's own fetch, and declares the few response fields it reads.
import { readFileSync } from "node:fs";

interface Finding { id: string; criterionTitle: string; observation: string; uncertainty: string; gradeLanguage?: string[]; excerpts: { quote: string }[] }
interface TeacherView { draft: { status: string; skipReason?: string; model: string }; findings: Finding[]; droppedByReason: Record<string, number>; releaseBlockers: string[] }
interface StudentView { findings: { criterion: string; text: string; evidence: { quote: string }[] }[]; notice?: string }

const BASE = (process.env.TEACHER_GATE_URL ?? "http://localhost:8787").replace(/\/$/, "");
const TOKEN = process.env.TEACHER_GATE_TOKEN;
const TEACHER = { id: "example-teacher", role: "teacher" } as const;

async function call<T>(as: { id: string; role: string }, method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "x-actor-id": as.id, "x-actor-role": as.role };
  if (TOKEN) headers.authorization = `Bearer ${TOKEN}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}/v1${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const json = (await res.json()) as T & { error?: string; message?: string };
  if (!res.ok) throw new Error(`${method} ${path} -> HTTP ${res.status} ${json.error}: ${json.message}`);
  return json;
}

// The synthetic dataset: an activity with a rubric, and 40 invented student paragraphs.
const data = JSON.parse(readFileSync(new URL("../../data/synthetic/cer-feedback.json", import.meta.url), "utf8")) as {
  activity: { id: string };
  items: { id: string; learnerRef: string; text: string }[];
};
const itemId = process.argv[2] ?? "syn-cer-01";
const item = data.items.find((i) => i.id === itemId);
if (item === undefined) throw new Error(`No item ${itemId} in cer-feedback.json`);

const health = (await (await fetch(`${BASE}/healthz`)).json()) as { model: string };
console.log(`Service at ${BASE}, model ${health.model}`);

// 1. The teacher sets up the activity: rubric and AI-help policy ("releasable").
await call(TEACHER, "PUT", `/activities/${data.activity.id}`, data.activity);

// 2. Draft feedback on one submission. learnerRef is opaque: never a name or email.
const submission = { id: `sub-${item.id}`, activityId: data.activity.id, learnerRef: item.learnerRef, artifacts: [{ id: "work", text: item.text }] };
console.log("Drafting (a local 7B model can take 10-60 seconds)...");
const draft = await call<{ id: string; status: string }>(TEACHER, "POST", "/drafts", submission);

// 3. The teacher's view: verified findings with quoted evidence.
let view = await call<TeacherView>(TEACHER, "GET", `/drafts/${draft.id}`);
console.log(`Draft ${draft.id}: ${view.draft.status}${view.draft.skipReason ? ` (${view.draft.skipReason})` : ""}; dropped by the verifier: ${JSON.stringify(view.droppedByReason)}`);
if (view.findings.length === 0) {
  console.log("No verified findings to review, so there is nothing to release. Try another item or model.");
  process.exit(0);
}

// 4. Decide on every finding. A real teacher reads each one; here the first is accepted, the
//    second edited, the third rejected, and so on. Text the gate flags as stating a grade or level
//    cannot be released as written, so it is always edited.
for (const [i, f] of view.findings.entries()) {
  console.log(`\n${f.id} [${f.criterionTitle}, uncertainty ${f.uncertainty}] ${f.observation}`);
  for (const e of f.excerpts) console.log(`   evidence: "${e.quote}"`);
  const choice = f.gradeLanguage !== undefined || i % 3 === 1 ? "edit" : i % 3 === 0 ? "accept" : "reject";
  const input = choice === "edit"
    ? { findingId: f.id, decision: "edit", text: `Next step: look again at "${f.excerpts[0]!.quote}" and say what it shows about your claim.` }
    : choice === "reject" ? { findingId: f.id, decision: "reject", reason: "Not what we focused on this week." } : { findingId: f.id, decision: "accept" };
  await call(TEACHER, "POST", `/drafts/${draft.id}/decisions`, input);
  console.log(`   teacher: ${choice}`);
}

// 5. Release, once nothing blocks it. Only a teacher acting directly can do this.
view = await call<TeacherView>(TEACHER, "GET", `/drafts/${draft.id}`);
if (view.releaseBlockers.length > 0) {
  console.log(`\nNot released: ${view.releaseBlockers.join(" ")}`);
  process.exit(0);
}
const release = await call<{ releasedBy: string; releasedAt: string; findings: unknown[] }>(TEACHER, "POST", `/drafts/${draft.id}/release`);
console.log(`\nReleased ${release.findings.length} finding(s) by ${release.releasedBy} at ${release.releasedAt}`);

// 6. What the student sees: only released text, in the teacher's words. The student's id must be
//    the submission's learnerRef.
const student = await call<StudentView>({ id: item.learnerRef, role: "student" }, "GET", `/submissions/${submission.id}/student-view`);
console.log(`\nStudent view for ${item.learnerRef} (${student.notice ?? ""}):`);
for (const f of student.findings) console.log(`- ${f.criterion}: ${f.text}${f.evidence.length ? `  (from your work: "${f.evidence[0]!.quote}")` : ""}`);

// A student cannot read the teacher's draft.
const denied = await fetch(`${BASE}/v1/drafts/${draft.id}`, { headers: { "x-actor-id": item.learnerRef, "x-actor-role": "student", ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}) } });
console.log(`\nA student reading the draft gets HTTP ${denied.status}.`);
