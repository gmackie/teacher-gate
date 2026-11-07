// Round 2 fixes: student-addressed findings by default, learned preferences enforced in code, and
// rejected words kept from reaching the student through a near-duplicate finding.
import { describe, expect, it } from "vitest";
import { FEEDBACK_INSTRUCTIONS, feedbackInstructions, findLeaks, nearlyIdentical, repeatsText, TeacherGate, verifyFindings, type DecisionRecord } from "../src";
import { ScriptedModel } from "../src/testing";
import { activity, findingsJson, goodFindings, student, submission, teacher, WORK } from "./fixtures";

describe("student-addressed findings (default prompt)", () => {
  it("asks for findings addressed to the student with one next step, and a separate teacher rationale", async () => {
    expect(FEEDBACK_INSTRUCTIONS).toContain('addressing them as "you"');
    expect(FEEDBACK_INSTRUCTIONS).toContain("one concrete next step");
    expect(FEEDBACK_INSTRUCTIONS).toContain('"rationale"');
    const model = new ScriptedModel([findingsJson(goodFindings)]);
    const gate = new TeacherGate({ model });
    await gate.putActivity(teacher, activity);
    await gate.draftFeedback(teacher, submission);
    expect(model.requests[0]!.system.startsWith(FEEDBACK_INSTRUCTIONS)).toBe(true);
  });

  it("can be overridden: the first round's teacher-addressed wording, or the developer's own", async () => {
    const teacherVoice = new ScriptedModel([findingsJson(goodFindings)]);
    const g1 = new TeacherGate({ model: teacherVoice, feedbackInstructions: feedbackInstructions("teacher") });
    await g1.putActivity(teacher, activity);
    await g1.draftFeedback(teacher, submission);
    expect(teacherVoice.requests[0]!.system).toContain("one specific observation a teacher could act on");
    expect(teacherVoice.requests[0]!.system).not.toContain('addressing them as "you"');

    const custom = new ScriptedModel([findingsJson(goodFindings)]);
    const g2 = new TeacherGate({ model: custom, feedbackInstructions: "MY HOUSE RULES" });
    await g2.putActivity(teacher, activity);
    await g2.draftFeedback(teacher, submission);
    expect(custom.requests[0]!.system.startsWith("MY HOUSE RULES")).toBe(true);
  });

  it("keeps the teacher-only rationale out of what the student sees", async () => {
    const withRationale = [{ ...goodFindings[0], observation: "You use measured times as evidence. Next, say which time is faster.", rationale: "Points to proficient: two measurements cited." }];
    const gate = new TeacherGate({ model: new ScriptedModel([findingsJson(withRationale)]) });
    await gate.putActivity(teacher, activity);
    const d = await gate.draftFeedback(teacher, submission);
    expect(d.findings[0]!.rationale).toBe("Points to proficient: two measurements cited.");
    expect((await gate.getDraft(teacher, d.id)).findings[0]!.rationale).toBeDefined();
    await gate.decide(teacher, d.id, { findingId: "f1", decision: "accept" });
    await gate.release(teacher, d.id);
    const view = await gate.studentView(student, submission.id);
    expect(JSON.stringify(view)).not.toContain("Points to proficient");
    // The independent leak check treats a rationale field as teacher-only.
    expect(findLeaks({ findings: [{ text: "x", rationale: "y" }] }, { activity, draft: d, decisions: [] }).map((l) => l.kind)).toContain("teacher-only-field");
  });
});

describe("learned preferences are enforced in code", () => {
  async function teachRejection(gate: TeacherGate, criterionToReject: string) {
    for (let i = 0; i < 3; i++) {
      const d = await gate.draftFeedback(teacher, { ...submission, id: `warm${i}` });
      for (const f of d.findings) await gate.decide(teacher, d.id, f.criterionId === criterionToReject ? { findingId: f.id, decision: "reject" } : { findingId: f.id, decision: "accept" });
    }
  }

  it("regression (round 1, Haiku): a model that inverts 'deprioritize reasoning' and returns only reasoning gets none through", async () => {
    const onlyReasoning = [
      { criterionId: "reasoning", observation: "You say metal is colder. Next, explain which way heat moves.", excerpts: [{ artifact: "a1", quote: "Metal is colder so it melts ice." }], uncertainty: "low" },
      { criterionId: "reasoning", observation: "You link the material to melting. Next, name conduction.", excerpts: [{ artifact: "a1", quote: "so it melts ice" }], uncertainty: "low" },
    ];
    let warm = 0;
    const model = new ScriptedModel(() => (warm++ < 3 ? findingsJson(goodFindings) : findingsJson(onlyReasoning)));
    const gate = new TeacherGate({ model });
    await gate.putActivity(teacher, activity);
    await teachRejection(gate, "reasoning");

    const d = await gate.draftFeedback(teacher, { ...submission, id: "after" });
    // Deterministic: no finding on the rejected criterion survives, whatever the model wrote.
    expect(d.findings.filter((f) => f.criterionId === "reasoning")).toEqual([]);
    expect(d.dropped).toEqual([{ reason: "deprioritized-criterion", criterionId: "reasoning" }, { reason: "deprioritized-criterion", criterionId: "reasoning" }]);
    // The model was never asked about it.
    expect(model.requests.at(-1)!.system).not.toContain('"id":"reasoning"');
    // The teacher can see the preference that did this, and how many suggestions it held back.
    const pref = d.appliedPreferences.find((p) => p.id === "deprioritize:reasoning");
    expect(pref?.description).toContain("held back");
    expect((await gate.getDraft(teacher, d.id)).droppedByReason).toEqual({ "deprioritized-criterion": 2 });

    // Turning it off restores the criterion.
    await gate.setPreference(teacher, activity.id, "deprioritize:reasoning", false);
    const again = await gate.draftFeedback(teacher, { ...submission, id: "after-off" });
    expect(again.findings.map((f) => f.criterionId)).toEqual(["reasoning", "reasoning"]);
  });

  it("never holds back every criterion", async () => {
    const gate = new TeacherGate({ model: new ScriptedModel([findingsJson(goodFindings)]) });
    await gate.putActivity(teacher, { ...activity, guidance: { criteria: ["evidence", "reasoning"] } });
    for (let i = 0; i < 3; i++) {
      const d = await gate.draftFeedback(teacher, { ...submission, id: `w${i}` });
      for (const f of d.findings) await gate.decide(teacher, d.id, { findingId: f.id, decision: "reject" });
    }
    const prefs = await gate.preferencesFor(activity.id);
    expect(prefs.deprioritized).toEqual([]);
    expect((await gate.draftFeedback(teacher, { ...submission, id: "next" })).findings).toHaveLength(2);
  });

  it("respects the teacher's criteria focus deterministically", async () => {
    const offFocus = [...goodFindings, { criterionId: "claim", observation: "You state a claim. Next, make it testable.", excerpts: [{ artifact: "a1", quote: "Metal is colder" }], uncertainty: "low" }];
    const gate = new TeacherGate({ model: new ScriptedModel([findingsJson(offFocus)]) });
    await gate.putActivity(teacher, { ...activity, guidance: { criteria: ["evidence"] } });
    const d = await gate.draftFeedback(teacher, submission);
    expect(d.findings.map((f) => f.criterionId)).toEqual(["evidence"]);
    expect(d.dropped.map((x) => x.reason)).toEqual(["unselected-criterion", "unselected-criterion"]);
    expect(d.appliedPreferences.map((p) => p.id)).toContain("guidance:criteria");
  });
});

describe("rejected words cannot reach the student through another criterion", () => {
  const same = "You wrote short sentences without linking words. Next, join two of them with because.";
  const twins = [
    { criterionId: "claim", observation: same, excerpts: [{ artifact: "a1", quote: "Metal is colder so it melts ice." }], uncertainty: "low" },
    { criterionId: "reasoning", observation: same, excerpts: [{ artifact: "a1", quote: "Metal is colder so it melts ice." }], uncertainty: "low" },
  ];

  it("compares text loosely enough to catch copies and strictly enough to keep distinct findings", () => {
    expect(nearlyIdentical("You use data well.", "you use data   well")).toBe(true);
    expect(nearlyIdentical("You use data well.", "You use reasoning well.")).toBe(false);
    expect(repeatsText(`Good start. ${same}`, same)).toBe(true);
    expect(repeatsText("You give two times. Next, compare them.", same)).toBe(false);
  });

  it("de-duplicates identical findings across criteria before review", async () => {
    const gate = new TeacherGate({ model: new ScriptedModel([findingsJson(twins)]) });
    await gate.putActivity(teacher, activity);
    const d = await gate.draftFeedback(teacher, submission);
    expect(d.findings.map((f) => f.criterionId)).toEqual(["claim"]);
    expect(d.dropped).toEqual([{ reason: "duplicate", criterionId: "reasoning" }]);
  });

  it("regression (round 1, Llama 3.1 8B, 3/80 items): reject one copy, accept the other — release is blocked", async () => {
    // Without de-duplication the draft holds both copies, as in round 1.
    const verified = verifyFindings(JSON.parse(findingsJson(twins)), { activity, artifacts: submission.artifacts, criteria: activity.rubric.criteria, dedupe: false });
    expect(verified.findings).toHaveLength(2);
    // Through the gate, a second copy with one extra sentence is too different to be removed as a
    // duplicate, so release itself must catch it.
    const variant = [twins[0], { ...twins[1], observation: `Watch your sentences. ${same}` }];
    const gate = new TeacherGate({ model: new ScriptedModel([findingsJson(variant)]) });
    await gate.putActivity(teacher, activity);
    const d = await gate.draftFeedback(teacher, submission);
    expect(d.findings).toHaveLength(2);
    await gate.decide(teacher, d.id, { findingId: "f1", decision: "reject" });
    await gate.decide(teacher, d.id, { findingId: "f2", decision: "accept" });
    const view = await gate.getDraft(teacher, d.id);
    expect(view.findings.find((f) => f.id === "f2")!.repeatsRejected).toEqual(["f1"]);
    expect(view.releaseBlockers.join(" ")).toContain("repeats the words of rejected finding f1");
    await expect(gate.release(teacher, d.id)).rejects.toMatchObject({ code: "conflict" });
    expect(JSON.stringify(await gate.studentView(student, submission.id))).not.toContain("linking words");

    // The teacher edits the rejected words out; then it releases, without them.
    await gate.decide(teacher, d.id, { findingId: "f2", decision: "edit", text: "Watch your sentences." });
    const release = await gate.release(teacher, d.id);
    expect(release.findings.map((f) => f.text)).toEqual(["Watch your sentences."]);
    const decisions = await gate.store.list<DecisionRecord>("decisions");
    expect(findLeaks(await gate.studentView(student, submission.id), { activity, draft: d, decisions, release })).toEqual([]);
  });

  it("does not flag a finding that only shares the work's quote with a rejected one", async () => {
    const distinct = [twins[0], { criterionId: "reasoning", observation: "You say metal is colder. Next, explain which way heat moves.", excerpts: [{ artifact: "a1", quote: WORK.slice(-32) }], uncertainty: "low" }];
    const gate = new TeacherGate({ model: new ScriptedModel([findingsJson(distinct)]) });
    await gate.putActivity(teacher, activity);
    const d = await gate.draftFeedback(teacher, submission);
    await gate.decide(teacher, d.id, { findingId: "f1", decision: "reject" });
    await gate.decide(teacher, d.id, { findingId: "f2", decision: "accept" });
    expect((await gate.release(teacher, d.id)).findings).toHaveLength(1);
  });
});
