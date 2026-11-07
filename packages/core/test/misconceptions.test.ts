import { describe, expect, it } from "vitest";
import { decideMapping, draftMisconceptionBrief, saveBrief, TeacherGate, type Misconception } from "../src";
import { ScriptedModel } from "../src/testing";
import { agent, teacher } from "./fixtures";

const catalog: Misconception[] = [
  { id: "cold-flows", title: "Cold flows into warm objects", description: "Thinks coldness moves, rather than heat.", standards: ["MS-PS3-3"] },
  { id: "metal-colder", title: "Metal is colder than plastic at room temperature", description: "Confuses conductivity with temperature.", standards: ["MS-PS3-3"] },
  { id: "unrelated", title: "Unrelated", description: "Other standard.", standards: ["MS-LS1-1"] },
];
const classSet = {
  id: "cs-1",
  item: { id: "q1", prompt: "Why does ice melt faster on metal?", standards: ["MS-PS3-3"] },
  responses: [
    { id: "r1", learnerRef: "L1", text: "The metal is colder so the cold goes into the ice." },
    { id: "r2", learnerRef: "L2", text: "Metal conducts heat from the room into the ice faster." },
    { id: "r3", learnerRef: "L3", text: "Metal is colder than the plastic." },
  ],
};
const reply = JSON.stringify({
  mappings: [
    { responseId: "r1", misconceptionId: "cold-flows", quote: "the cold goes into the ice", uncertainty: "low" },
    { responseId: "r3", misconceptionId: "metal-colder", quote: "Metal is colder than the plastic.", uncertainty: "low" },
    { responseId: "r1", misconceptionId: "metal-colder", quote: "The metal is colder", uncertainty: "medium" },
    { responseId: "r2", misconceptionId: "cold-flows", quote: "cold moves", uncertainty: "high" },
    { responseId: "r2", misconceptionId: "unrelated", quote: "Metal conducts", uncertainty: "high" },
  ],
  strengths: [{ responseId: "r2", note: "Names conduction.", quote: "Metal conducts heat" }],
});

describe("class misconception brief (Task 2)", () => {
  it("verifies mappings, needs the teacher to decide each, and saves only confirmed patterns", async () => {
    const model = new ScriptedModel([reply]);
    const gate = new TeacherGate({ model });
    const draft = await draftMisconceptionBrief(gate, agent, classSet, catalog);
    expect(model.requests[0]!.system).not.toContain("Unrelated");
    expect(draft.mappings.map((m) => `${m.responseId}:${m.misconceptionId}`)).toEqual(["r1:cold-flows", "r3:metal-colder", "r1:metal-colder"]);
    expect(draft.dropped.map((d) => d.reason)).toEqual(["quote-not-found", "unknown-misconception"]);

    await expect(decideMapping(gate, agent, draft.id, { mappingId: "m1", decision: "confirm" })).rejects.toMatchObject({ code: "forbidden" });
    await decideMapping(gate, teacher, draft.id, { mappingId: "m1", decision: "confirm" });
    await expect(saveBrief(gate, teacher, draft.id)).rejects.toMatchObject({ code: "conflict" });
    await decideMapping(gate, teacher, draft.id, { mappingId: "m2", decision: "confirm" });
    await decideMapping(gate, teacher, draft.id, { mappingId: "m3", decision: "reject" });
    const saved = await saveBrief(gate, teacher, draft.id);
    expect(saved.patterns.map((p) => [p.misconception.id, p.count])).toEqual([["cold-flows", 1], ["metal-colder", 1]]);
    expect(saved.markdown).toContain('"the cold goes into the ice"');
    expect(saved.markdown).toContain("Names conduction.");
  });
});
