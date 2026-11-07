import { describe, expect, it } from "vitest";
import { extractJson, verifyFindings } from "../src";
import { activity, WORK } from "./fixtures";

const artifacts = [{ id: "a1", text: WORK }];
const criteria = activity.rubric.criteria;
const run = (findings: unknown[], policy: "locate" | "strict" = "locate") => verifyFindings({ findings }, { activity, artifacts, criteria }, policy);
const finding = (over: Record<string, unknown> = {}) => ({ criterionId: "evidence", observation: "x", excerpts: [{ artifact: "a1", quote: "melted in 4 minutes" }], uncertainty: "low", ...over });

describe("verifyFindings", () => {
  it("keeps a finding whose quote is exactly in the work and anchors it", () => {
    const r = run([finding()]);
    expect(r.findings).toHaveLength(1);
    const e = r.findings[0]!.excerpts[0]!;
    expect(WORK.slice(e.start, e.end)).toBe("melted in 4 minutes");
    expect(e.anchoring).toBe("located");
  });

  it("drops a fabricated quote, including a corrected spelling or paraphrase", () => {
    expect(run([finding({ excerpts: [{ artifact: "a1", quote: "melted in four minutes" }] })]).dropped).toEqual([{ reason: "quote-not-found", criterionId: "evidence" }]);
  });

  it("drops the whole finding when any one of its quotes is wrong", () => {
    const r = run([finding({ excerpts: [{ artifact: "a1", quote: "melted in 4 minutes" }, { artifact: "a1", quote: "not there" }] })]);
    expect(r.findings).toHaveLength(0);
  });

  it("counts a wrong range as misplaced but re-anchors under locate, and drops under strict", () => {
    const wrong = finding({ excerpts: [{ artifact: "a1", quote: "melted in 4 minutes", start: 0, end: 19 }] });
    const located = run([wrong]);
    expect(located.findings).toHaveLength(1);
    expect(located.misplacedRanges).toBe(1);
    expect(run([wrong], "strict").dropped[0]!.reason).toBe("range-mismatch");
    const at = WORK.indexOf("melted in 4 minutes");
    const exact = run([finding({ excerpts: [{ artifact: "a1", quote: "melted in 4 minutes", start: at, end: at + 19 }] })], "strict");
    expect(exact.findings[0]!.excerpts[0]!.anchoring).toBe("exact");
  });

  it("drops findings with grading fields, unknown criteria, unselected criteria and unknown levels", () => {
    const r = verifyFindings(
      { findings: [finding({ score: 3 }), finding({ criterionId: "spelling" }), finding({ criterionId: "claim" }), finding({ suggestedLevel: "exemplary" })] },
      { activity, artifacts, criteria: criteria.filter((c) => c.id !== "claim") },
    );
    expect(r.dropped.map((d) => d.reason)).toEqual(["forbidden-field", "unknown-criterion", "unselected-criterion", "unknown-level"]);
  });

  it("rejects output that is not a findings object", () => {
    expect(verifyFindings("nope", { activity, artifacts, criteria }).parsed).toBe(false);
  });
});

describe("extractJson", () => {
  it("reads bare and fenced JSON and refuses prose", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('Here:\n```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(extractJson("no json")).toBeUndefined();
  });
});
