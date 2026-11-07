import { describe, expect, it } from "vitest";
import { approveVariant, binaryKappa, createGoal, denyListModerator, draftVariant, dryRunGoal, evaluateGoal, goalReport, recordGoalJudgement, TeacherGate } from "../src";
import { ScriptedModel } from "../src/testing";
import { activity, agent, findingsJson, goodFindings, student, submission, teacher } from "./fixtures";

describe("teacher goals and monitoring (Task 4)", () => {
  it("dry-runs a goal with verified evidence, then reports agreement and drift", async () => {
    let clock = Date.parse("2027-02-01T00:00:00Z");
    // The AI says "met" for even-numbered submissions, citing real text; once with a fabricated quote.
    const model = new ScriptedModel((req) => {
      if (req.user.includes("FAKE")) return JSON.stringify({ met: true, evidence: ["not in the work"] });
      const n = Number(/sub-(\d+)/.exec(req.user)?.[1] ?? /item (\d+)/.exec(req.user)?.[1] ?? 0);
      return JSON.stringify({ met: n % 2 === 0, evidence: ["melted in 4 minutes"], rationale: "r" });
    });
    const gate = new TeacherGate({ model, now: () => new Date(clock) });
    await gate.putActivity(teacher, activity);
    await expect(createGoal(gate, agent, { activityId: activity.id, statement: "Cite evidence for every claim." })).rejects.toMatchObject({ code: "forbidden" });
    const goal = await createGoal(gate, teacher, { activityId: activity.id, statement: "Cite evidence for every claim.", criterionId: "evidence" });
    const sub = (i: number, text = `item ${i}: The ice melted in 4 minutes.`) => ({ ...submission, id: `sub-${i}`, artifacts: [{ id: "a1", text }] });
    const dry = await dryRunGoal(gate, agent, goal.id, [sub(2), sub(3), sub(5, "FAKE item 5: melted in 4 minutes")]);
    expect([dry.met, dry.notMet, dry.unverified]).toEqual([1, 1, 1]);
    expect(await gate.store.list("goal-runs")).toEqual([]);

    // Week 1: the teacher agrees with every AI judgement. Week 2: the teacher disagrees with all.
    for (let i = 0; i < 12; i++) {
      if (i === 6) clock += 8 * 86_400_000;
      const ai = await evaluateGoal(gate, agent, goal.id, sub(i));
      await recordGoalJudgement(gate, teacher, goal.id, `sub-${i}`, i < 6 ? ai.met === true : ai.met !== true);
      clock += 60_000;
    }
    const report = await goalReport(gate, teacher, goal.id, { minPairs: 5 });
    expect(report.windows.map((w) => [w.pairs, w.agreement])).toEqual([[6, 1], [6, 0]]);
    expect(report.drift?.delta).toBe(-1);
    expect(report.overall.agreement).toBe(0.5);
  });

  it("computes Cohen's kappa for binary judgements", () => {
    expect(binaryKappa([[true, true], [false, false]])).toBe(1);
    expect(binaryKappa([[true, true]])).toBeNull();
  });
});

describe("language and reading-level variants", () => {
  async function released() {
    const model = new ScriptedModel((req) =>
      req.system.includes("rewrite a teacher's approved feedback")
        ? JSON.stringify({ findings: [{ findingId: "f1", text: "Usaste tiempos medidos como evidencia." }] })
        : findingsJson(goodFindings),
    );
    const gate = new TeacherGate({ model, moderator: denyListModerator(["forbidden"]) });
    await gate.putActivity(teacher, activity);
    const draft = await gate.draftFeedback(teacher, submission);
    return { gate, draft, model };
  }

  it("rewrites only released, teacher-approved text and shows it after the teacher approves the variant", async () => {
    const { gate, draft, model } = await released();
    await expect(draftVariant(gate, teacher, draft.id, { language: "es" })).rejects.toMatchObject({ code: "conflict" });
    await gate.decide(teacher, draft.id, { findingId: "f1", decision: "accept" });
    await gate.decide(teacher, draft.id, { findingId: "f2", decision: "reject" });
    await gate.release(teacher, draft.id);
    const variant = await draftVariant(gate, agent, draft.id, { language: "es", readingLevel: 5 });
    // The rewrite saw only the approved text: never the rejected finding or the student's work.
    const sent = model.requests.at(-1)!.user;
    expect(sent).toContain("Uses measured melting times");
    expect(sent).not.toContain("Metal is colder");
    expect((await gate.studentView(student, submission.id, { language: "es" })).variant).toBeUndefined();
    await expect(approveVariant(gate, agent, draft.id, variant.id)).rejects.toMatchObject({ code: "forbidden" });
    await approveVariant(gate, teacher, draft.id, variant.id);
    const view = await gate.studentView(student, submission.id, { language: "es" });
    expect(view.findings[0]!.text).toBe("Usaste tiempos medidos como evidencia.");
    expect(view.variant?.language).toBe("es");
  });

  it("refuses a rewrite that drops a finding", async () => {
    const { gate, draft } = await released();
    await gate.decide(teacher, draft.id, { findingId: "f1", decision: "accept" });
    await gate.decide(teacher, draft.id, { findingId: "f2", decision: "accept" });
    await gate.release(teacher, draft.id);
    await expect(draftVariant(gate, teacher, draft.id, { readingLevel: 4 })).rejects.toMatchObject({ code: "conflict" });
  });
});
