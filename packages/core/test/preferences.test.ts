import { describe, expect, it } from "vitest";
import { TeacherGate } from "../src";
import { ScriptedModel } from "../src/testing";
import { activity, findingsJson, goodFindings, submission, teacher } from "./fixtures";

describe("teacher guidance and past decisions (Task 3)", () => {
  it("applies guidance and learned preferences to later drafts and lists each one", async () => {
    const model = new ScriptedModel([findingsJson(goodFindings)]);
    const gate = new TeacherGate({ model });
    await gate.putActivity(teacher, { ...activity, guidance: { instructions: "Start with a strength.", criteria: ["evidence", "reasoning"] } });
    for (let i = 0; i < 3; i++) {
      const d = await gate.draftFeedback(teacher, { ...submission, id: `s${i}` });
      await gate.decide(teacher, d.id, { findingId: "f1", decision: "edit", text: `Nice use of data (${i}).` });
      await gate.decide(teacher, d.id, { findingId: "f2", decision: "reject" });
    }
    const next = await gate.draftFeedback(teacher, { ...submission, id: "s9" });
    expect(next.appliedPreferences.map((p) => p.id)).toEqual(expect.arrayContaining(["guidance:criteria", "guidance:instructions", "deprioritize:reasoning"]));
    expect(next.appliedPreferences.filter((p) => p.kind === "edit-example")).toHaveLength(3);
    const prompt = model.requests.at(-1)!.system;
    expect(prompt).toContain("Start with a strength.");
    expect(prompt).toContain("Nice use of data (2).");
    expect(prompt).toContain('["reasoning"]');
    expect(prompt).not.toContain('"id":"claim"');

    await gate.setPreference(teacher, activity.id, "deprioritize:reasoning", false);
    const after = await gate.draftFeedback(teacher, { ...submission, id: "s10" });
    expect(after.appliedPreferences.map((p) => p.id)).not.toContain("deprioritize:reasoning");
    expect(model.requests.at(-1)!.system).not.toContain("usually rejects");
  });

  it("does not learn when the teacher turns learning off", async () => {
    const gate = new TeacherGate({ model: new ScriptedModel([findingsJson(goodFindings)]) });
    await gate.putActivity(teacher, { ...activity, guidance: { learnFromDecisions: false } });
    const d = await gate.draftFeedback(teacher, submission);
    await gate.decide(teacher, d.id, { findingId: "f1", decision: "edit", text: "Mine." });
    expect((await gate.preferencesFor(activity.id)).applied).toEqual([]);
  });
});
