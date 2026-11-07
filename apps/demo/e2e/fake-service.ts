// A Teacher Gate service for the accessibility audit: the real HTTP service and core, with a
// scripted model in place of a provider, so every screen of the demo can be reached offline and
// deterministically. It answers each kind of request (feedback, brief, goal check, rewrite) with
// output that passes verification: every quote is taken from the work it was sent.
import { MemoryStore, TeacherGate, type ModelRequest } from "@teacher-gate/core";
import { ScriptedModel, untrustedPayload } from "@teacher-gate/core/testing";
import { createServer, phase2Routes } from "@teacher-gate/server";

const sentences = (text: string) => text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);

function reply(request: ModelRequest): string {
  if (request.system.startsWith("You rewrite a teacher's approved feedback")) {
    const { findings } = JSON.parse(request.user) as { findings: { findingId: string; text: string }[] };
    return JSON.stringify({ findings: findings.map((f) => ({ findingId: f.findingId, text: `Versión reescrita: ${f.text}` })) });
  }
  const payload = untrustedPayload(request) as { artifacts?: { artifact: string; text: string }[]; responses?: { responseId: string; text: string }[] };
  if (payload.responses !== undefined) {
    const indicators: [string, string][] = [["is colder", "syn-metal-is-colder"], ["the cold flow", "syn-cold-flows"], ["blocks the cold", "syn-insulator-blocks-cold"], ["has more heat", "syn-heat-is-temperature"]];
    const mappings = payload.responses.flatMap((r) => indicators.filter(([q]) => r.text.includes(q)).map(([quote, misconceptionId]) => ({ responseId: r.responseId, misconceptionId, quote, uncertainty: "low" })));
    const strengths = payload.responses.filter((r) => r.text.includes("better conductor")).map((r) => ({ responseId: r.responseId, note: "Names conduction.", quote: "better conductor" }));
    return JSON.stringify({ mappings, strengths });
  }
  const artifact = payload.artifacts?.[0];
  if (artifact === undefined) return "{}";
  const parts = sentences(artifact.text);
  const withData = parts.find((s) => /\d/.test(s));
  if (request.system.startsWith("You check one student's work against a goal")) {
    return JSON.stringify(withData === undefined
      ? { met: false, evidence: [parts[0]], rationale: "No measured times are given." }
      : { met: true, evidence: [withData], rationale: "Cites measured melting times." });
  }
  const finding = (criterionId: string, quote: string, observation: string) => ({ criterionId, observation, rationale: "Scripted for the accessibility audit.", suggestedLevel: "developing", excerpts: [{ artifact: artifact.artifact, quote }], uncertainty: "medium" });
  return JSON.stringify({
    findings: [
      finding("claim", parts[0]!, "You answer the question in your first sentence. Next, name both plates in your claim."),
      finding("evidence", withData ?? parts[1] ?? parts[0]!, "You point to what happened in the test. Next, give the time for each plate."),
      finding("reasoning", parts.at(-1)!, "You explain why with energy ideas. Next, say which way thermal energy moves."),
    ],
  });
}

const gate = new TeacherGate({ model: new ScriptedModel(reply, "scripted/a11y-audit"), store: new MemoryStore() });
const port = Number(process.env.PORT ?? 8817);
createServer(gate, { tokens: new Map(), insecureDev: true, routes: phase2Routes() }).listen(port, () => console.log(`fake Teacher Gate on ${port}`));
