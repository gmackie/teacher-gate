import { describe, expect, it } from "vitest";
import { ScriptedModel } from "@teacher-gate/core/testing";
import type { ScoredItem } from "@teacher-gate/public-goods";
import { classifyQuote, fairness, quadraticKappa, rate, runBaselineItem, runHarnessItem, scoreRaw, simulatedDecision, stratifiedSample, summarise } from "../src";

const activity = {
  id: "act", title: "Essay", aiHelp: "releasable" as const,
  rubric: { id: "r", title: "R", criteria: [{ id: "c1", title: "Ideas", levels: [{ id: "low", label: "Low" }, { id: "mid", label: "Middle" }, { id: "high", label: "High" }] }] },
};
const text = "Dogs are lyal. They protect the house at night.";
const item: ScoredItem = { id: "i1", learnerRef: "L1", text, labels: { c1: "low" }, groups: { g: "a" } };

describe("eval helpers", () => {
  it("classifies quotes as exact, near misses and fabrications", () => {
    expect(classifyQuote("Dogs are lyal.", text)).toBe("exact");
    expect(classifyQuote("dogs  are lyal.", text)).toBe("nearMiss");
    expect(classifyQuote("Dogs are loyal.", text)).toBe("notFound");
  });
  it("computes Wilson intervals and quadratic kappa", () => {
    expect(rate(0, 0).rate).toBeNull();
    const r = rate(5, 10);
    expect(r.ci95![0]).toBeCloseTo(0.237, 2);
    expect(quadraticKappa([[1, 1], [2, 2], [3, 3]], 3)).toBeCloseTo(1);
  });
  it("samples reproducibly by group", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: i, g: i % 2 ? "x" : "y" }));
    const a = stratifiedSample(items, (t) => t.g, ["x", "y"], 3, 7);
    expect(a).toEqual(stratifiedSample(items, (t) => t.g, ["x", "y"], 3, 7));
    expect(a.filter((t) => t.g === "x")).toHaveLength(3);
  });
  it("counts fabricated and grading-field findings in a raw output", () => {
    const s = scoreRaw({ findings: [{ criterionId: "c1", observation: "o", excerpts: [{ artifact: "work", quote: "Dogs are loyal." }], uncertainty: "low" }, { criterionId: "c1", observation: "o", score: 2, excerpts: [{ artifact: "work", quote: "Dogs are lyal." }], uncertainty: "low" }] }, text);
    expect(s).toMatchObject({ parsed: true, findingsTotal: 2, schemaValid: 1, findingsWithFabricatedQuote: 1 });
  });
  it("simulates a teacher from labels: rejects far levels and edits out level talk", () => {
    expect(simulatedDecision(activity, item, { criterionId: "c1", observation: "Good.", suggestedLevelId: "high" })).toEqual({ decision: "reject" });
    expect(simulatedDecision(activity, item, { criterionId: "c1", observation: "Spell loyal carefully. This is at the Low level.", suggestedLevelId: "low" })).toEqual({ decision: "edit", text: "Spell loyal carefully." });
  });
});

describe("Task 1 arms", () => {
  const reply = JSON.stringify({ findings: [
    { criterionId: "c1", observation: "Check the spelling of lyal.", suggestedLevel: "low", excerpts: [{ artifact: "work", quote: "Dogs are lyal." }], uncertainty: "low" },
    { criterionId: "c1", observation: "Good detail. Score: 2/3.", suggestedLevel: "mid", excerpts: [{ artifact: "work", quote: "They guard the house." }], uncertainty: "low" },
  ] });
  it("the harness surfaces only verified evidence and leaks nothing; the baseline passes everything through", async () => {
    const o = { activity, model: new ScriptedModel([reply]) };
    const h = await runHarnessItem(o, item);
    const b = await runBaselineItem({ activity, model: new ScriptedModel([reply]) }, item);
    expect(h).toMatchObject({ findingsTotal: 2, findingsWithFabricatedQuote: 1, surfaced: 1, surfacedWithInexactQuote: 0, leaks: [] });
    expect(h.studentFacing).toEqual(["Check the spelling of lyal."]);
    expect(b).toMatchObject({ surfaced: 2, surfacedWithInexactQuote: 1, structuredLevels: 2 });
    expect(b.leaks.length).toBeGreaterThan(0);
    const sh = summarise(activity, [item], [h]);
    expect(sh.inexactEvidenceSurfaced.rate).toBe(0);
    expect(sh.agreement.exact.rate).toBe(1);
    const rows = fairness(activity, [item], [h, b], ["g"]);
    expect(rows.map((r) => r.arm)).toEqual(["harness", "baseline"]);
  });
});
