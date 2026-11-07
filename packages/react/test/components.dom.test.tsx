// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { studentFeedbackView, teacherDraftView, type Activity, type Artifact, type BriefDraft, type DecisionRecord, type FeedbackDraft, type ReleaseRecord } from "@teacher-gate/core";
import { BriefReview, segmentText, StudentFeedback, TeacherReview, type BriefState } from "../src";

afterEach(cleanup);

const WORK = "The ice on the metal plate melted in 4 minutes. The plastic one took 11 minutes. Metal is colder so it melts ice.";
const work: Artifact[] = [{ id: "a1", text: WORK }];

const activity: Activity = {
  id: "cer-1",
  title: "Ice",
  aiHelp: "releasable",
  rubric: {
    id: "cer",
    title: "CER",
    criteria: [
      { id: "evidence", title: "Evidence", levels: [{ id: "beginning", label: "Beginning" }, { id: "proficient", label: "Proficient" }] },
      { id: "reasoning", title: "Reasoning", levels: [{ id: "beginning", label: "Beginning" }, { id: "proficient", label: "Proficient" }] },
    ],
  },
};

const span = (quote: string) => {
  const start = WORK.indexOf(quote);
  return { artifactId: "a1", start, end: start + quote.length, quote, anchoring: "exact" as const };
};

// f1 and f2 overlap on "melted in 4 minutes"; f3 has a grade-language observation.
const draft: FeedbackDraft = {
  id: "d1",
  kind: "feedback",
  activityId: "cer-1",
  submissionId: "s1",
  learnerRef: "L1",
  createdAt: "2026-11-07T00:00:00.000Z",
  requestedBy: { id: "t1", role: "teacher", channel: "direct" },
  model: "test",
  status: "completed",
  findings: [
    { id: "f1", source: "ai-suggested", criterionId: "evidence", observation: "Uses measured melting times.", suggestedLevelId: "proficient", excerpts: [span("metal plate melted in 4 minutes")], uncertainty: "low" },
    { id: "f2", source: "ai-suggested", criterionId: "evidence", observation: "Compares the two times.", excerpts: [span("melted in 4 minutes. The plastic one took 11 minutes")], uncertainty: "medium" },
    { id: "f3", source: "ai-suggested", criterionId: "reasoning", observation: "This reasoning is at the Beginning level.", suggestedLevelId: "beginning", excerpts: [span("Metal is colder")], uncertainty: "high" },
  ],
  dropped: [{ reason: "quote-not-found", criterionId: "evidence" }, { reason: "quote-not-found" }, { reason: "quote-not-found" }, { reason: "forbidden-field" }],
  misplacedRanges: 0,
  appliedPreferences: [{ id: "guidance:instructions", kind: "instructions", source: "guidance", description: "Your written instructions for this activity." }],
};

const decision = (findingId: string, d: DecisionRecord["decision"], extra: Partial<DecisionRecord> = {}): DecisionRecord => ({
  id: `x-${findingId}`, draftId: "d1", activityId: "cer-1", findingId, criterionId: "evidence", decision: d, originalObservation: "", decidedBy: "t1", decidedAt: "2026-11-07T00:01:00.000Z", ...extra,
});

function renderReview(decisions: DecisionRecord[] = []) {
  const onDecide = vi.fn(async () => {});
  const onRelease = vi.fn(async () => {});
  const view = teacherDraftView(activity, draft, decisions, undefined);
  const utils = render(<TeacherReview view={view} work={work} onDecide={onDecide} onRelease={onRelease} criteria={activity.rubric.criteria} />);
  return { ...utils, onDecide, onRelease, view };
}

function finding(n: number) {
  return screen.getByRole("heading", { name: new RegExp(`^Finding ${n}:`) }).closest("li")!;
}

describe("segmentText", () => {
  it("cuts overlapping and nested ranges into segments that rebuild the text", () => {
    const segs = segmentText("abcdefghij", [{ key: "x", start: 2, end: 6 }, { key: "y", start: 4, end: 9 }, { key: "z", start: 5, end: 6 }, { key: "bad", start: 7, end: 7 }]);
    expect(segs.map((s) => s.text).join("")).toBe("abcdefghij");
    expect(segs.map((s) => [s.start, s.end, s.keys])).toEqual([
      [0, 2, []],
      [2, 4, ["x"]],
      [4, 5, ["x", "y"]],
      [5, 6, ["x", "y", "z"]],
      [6, 9, ["y"]],
      [9, 10, []],
    ]);
  });

  it("clamps ranges to the text", () => {
    expect(segmentText("abc", [{ key: "k", start: 1, end: 99 }]).map((s) => [s.text, s.keys])).toEqual([["a", []], ["bc", ["k"]]]);
  });
});

describe("TeacherReview", () => {
  it("highlights each finding's evidence at its offsets, including where findings overlap", () => {
    const { container } = renderReview();
    const marks = [...container.querySelectorAll("mark")];
    // Every mark's text is exactly the work at its offsets.
    for (const m of marks) expect(m.textContent).toBe(WORK.slice(Number(m.dataset.start), Number(m.dataset.end)));
    const covered = (key: string) => marks.filter((m) => m.dataset.keys!.split(" ").includes(key)).map((m) => m.textContent).join("");
    expect(covered("f1")).toBe("metal plate melted in 4 minutes");
    expect(covered("f2")).toBe("melted in 4 minutes. The plastic one took 11 minutes");
    expect(covered("f3")).toBe("Metal is colder");
    const overlap = marks.find((m) => m.dataset.keys === "f1 f2")!;
    expect(overlap.textContent).toBe("melted in 4 minutes");
    expect(overlap.className).toContain("tg-mark--overlap");
    // The mark is described by both findings' headings.
    const ids = overlap.getAttribute("aria-describedby")!.split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual(["Finding 1: Evidence", "Finding 2: Evidence"]);
    // The whole text is still there, once.
    expect(container.querySelector(".tg-work-text")!.textContent).toBe(WORK);
  });

  it("focuses a finding from its evidence and the evidence from its finding", () => {
    const { container } = renderReview();
    const f3mark = [...container.querySelectorAll("mark")].find((m) => m.dataset.keys === "f3")!;
    fireEvent.click(f3mark);
    expect(finding(3).className).toContain("tg-finding--focused");
    expect(document.activeElement).toBe(finding(3));
    fireEvent.click(within(finding(1)).getByRole("button", { name: "Show in the work" }));
    expect(finding(1).className).toContain("tg-finding--focused");
    expect((document.activeElement as HTMLElement).tagName).toBe("MARK");
    expect((document.activeElement as HTMLElement).dataset.keys).toContain("f1");
    // Keyboard: Enter on a highlight focuses its finding too.
    fireEvent.keyDown(f3mark, { key: "Enter" });
    expect(document.activeElement).toBe(finding(3));
  });

  it("shows the teacher-only level, uncertainty, grade-language warning, preferences and dropped counts", () => {
    renderReview();
    expect(within(finding(1)).getByText("Proficient")).toBeTruthy();
    expect(within(finding(1)).getByText("teacher only")).toBeTruthy();
    expect(within(finding(3)).getByText(/High/)).toBeTruthy();
    expect(within(finding(3)).getByText(/edit this text before release/)).toBeTruthy();
    expect(within(finding(1)).queryByText(/edit this text before release/)).toBeNull();
    expect(screen.getByText("Your written instructions for this activity.")).toBeTruthy();
    expect(screen.getByText("3 findings dropped: quote not found in the work")).toBeTruthy();
    expect(screen.getByText("1 finding dropped: it tried to assign a score or grade")).toBeTruthy();
  });

  it("calls onDecide with the right DecisionInput for accept, edit and reject", async () => {
    const { onDecide } = renderReview();
    fireEvent.click(within(finding(1)).getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(onDecide).toHaveBeenLastCalledWith({ findingId: "f1", decision: "accept" }));

    await waitFor(() => expect(within(finding(3)).getByRole("button", { name: "Edit" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(within(finding(3)).getByRole("button", { name: "Edit" }));
    const text = within(finding(3)).getByLabelText("Feedback the student will see");
    expect((text as HTMLTextAreaElement).value).toBe("This reasoning is at the Beginning level.");
    fireEvent.change(text, { target: { value: "Explain which way heat moves." } });
    fireEvent.change(within(finding(3)).getByLabelText(/Level/), { target: { value: "" } });
    fireEvent.click(within(finding(3)).getByRole("button", { name: "Save edit" }));
    await waitFor(() => expect(onDecide).toHaveBeenLastCalledWith({ findingId: "f3", decision: "edit", text: "Explain which way heat moves." }));

    await waitFor(() => expect(within(finding(1)).getByRole("button", { name: "Edit" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(within(finding(1)).getByRole("button", { name: "Edit" }));
    fireEvent.click(within(finding(1)).getByRole("button", { name: "Save edit" }));
    await waitFor(() => expect(onDecide).toHaveBeenLastCalledWith({ findingId: "f1", decision: "edit", text: "Uses measured melting times.", levelId: "proficient" }));

    await waitFor(() => expect(within(finding(2)).getByRole("button", { name: "Reject" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(within(finding(2)).getByRole("button", { name: "Reject" }));
    fireEvent.change(within(finding(2)).getByLabelText(/Reason/), { target: { value: "Repeats finding 1" } });
    fireEvent.click(within(finding(2)).getByRole("button", { name: "Confirm reject" }));
    await waitFor(() => expect(onDecide).toHaveBeenLastCalledWith({ findingId: "f2", decision: "reject", reason: "Repeats finding 1" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Reject finding 2: done."));
  });

  it("keeps Release disabled and lists blockers until the draft is releasable", async () => {
    renderReview();
    const release = screen.getByRole("button", { name: "Release to student" });
    expect(release.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/Decide on every finding first/)).toBeTruthy();
    cleanup();

    // Accepting the grade-language finding as written still blocks release.
    renderReview([decision("f1", "accept"), decision("f2", "reject"), decision("f3", "accept", { criterionId: "reasoning" })]);
    expect(screen.getByRole("button", { name: "Release to student" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Finding f3 states a grade or level; edit it before release.")).toBeTruthy();
    expect(within(finding(1)).getByText("Decision: Accepted")).toBeTruthy();
    cleanup();

    const { onRelease } = renderReview([decision("f1", "accept"), decision("f2", "reject"), decision("f3", "edit", { criterionId: "reasoning", editedObservation: "Explain which way heat moves." })]);
    const ready = screen.getByRole("button", { name: "Release to student" });
    expect(ready.hasAttribute("disabled")).toBe(false);
    fireEvent.click(ready);
    await waitFor(() => expect(onRelease).toHaveBeenCalledTimes(1));
  });
});

describe("StudentFeedback", () => {
  it("shows released text with evidence and no level, uncertainty or rejected finding", () => {
    const release: ReleaseRecord = {
      draftId: "d1", submissionId: "s1", activityId: "cer-1", learnerRef: "L1", releasedBy: "t1", releasedAt: "2026-11-07T00:02:00.000Z", variants: [],
      findings: [
        { findingId: "f1", criterionId: "evidence", criterionTitle: "Evidence", text: "Uses measured melting times.", excerpts: [span("metal plate melted in 4 minutes")] },
        { findingId: "f3", criterionId: "reasoning", criterionTitle: "Reasoning", text: "Explain which way heat moves.", excerpts: [span("Metal is colder")] },
      ],
    };
    const { container } = render(<StudentFeedback view={studentFeedbackView("s1", release)} work={work} />);
    expect(screen.getByText("Uses measured melting times.")).toBeTruthy();
    expect(screen.getByText("Explain which way heat moves.")).toBeTruthy();
    expect(screen.getByText("Drafted with AI and reviewed by your teacher.")).toBeTruthy();
    const text = container.textContent!;
    for (const hidden of ["Proficient", "Beginning", "teacher only", "Uncertainty", "Compares the two times", "Low", "Medium", "High"]) expect(text).not.toContain(hidden);
    const marks = [...container.querySelectorAll("mark")].map((m) => m.textContent);
    expect(marks).toEqual(["metal plate melted in 4 minutes", "Metal is colder"]);
  });

  it("says when nothing has been released", () => {
    render(<StudentFeedback view={studentFeedbackView("s1", undefined)} work={work} />);
    expect(screen.getByText("No feedback has been shared with you yet.")).toBeTruthy();
  });
});

describe("BriefReview", () => {
  const catalog = [
    { id: "cold-flows", title: "Cold flows into things", description: "Thinks cold moves rather than heat." },
    { id: "metal-colder", title: "Metal is colder", description: "Thinks metal is at a lower temperature." },
  ];
  const briefDraft: BriefDraft = {
    id: "b1", kind: "brief", classSetId: "cs1", item: { id: "ice", prompt: "Why does ice melt faster on metal?" }, responses: 2, createdAt: "", requestedBy: { id: "t1", role: "teacher", channel: "direct" }, model: "test", catalog,
    mappings: [
      { id: "m1", responseId: "r1", learnerRef: "S-01", misconceptionId: "metal-colder", quote: "metal is colder", start: 0, end: 15, uncertainty: "low" },
      { id: "m2", responseId: "r2", learnerRef: "S-02", misconceptionId: "metal-colder", quote: "the cold goes in", start: 0, end: 16, uncertainty: "medium" },
    ],
    strengths: [], dropped: [{ reason: "quote-not-found" }], invalidBatches: 0, usage: { inputTokens: 0, outputTokens: 0 },
  };

  it("groups mappings, sends confirm/reject/reassign, and enables Save only when all are decided", async () => {
    const onDecide = vi.fn(async () => {});
    const onSave = vi.fn(async () => {});
    const open: BriefState = { draft: briefDraft, decisions: [], open: ["m1", "m2"] };
    const { rerender } = render(<BriefReview brief={open} onDecide={onDecide} onSave={onSave} />);
    expect(screen.getByRole("heading", { name: "Metal is colder (2)" })).toBeTruthy();
    expect(screen.getByText("1 mapping dropped: quote not found in the response")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save brief" }).hasAttribute("disabled")).toBe(true);
    const m2 = screen.getByRole("group", { name: "S-02, response r2" });
    fireEvent.change(within(m2).getByLabelText("Reassign to"), { target: { value: "cold-flows" } });
    fireEvent.click(within(m2).getByRole("button", { name: "Reassign" }));
    await waitFor(() => expect(onDecide).toHaveBeenLastCalledWith({ mappingId: "m2", decision: "reassign", misconceptionId: "cold-flows" }));
    const m1 = screen.getByRole("group", { name: "S-01, response r1" });
    await waitFor(() => expect(within(m1).getByRole("button", { name: "Confirm" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(within(m1).getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(onDecide).toHaveBeenLastCalledWith({ mappingId: "m1", decision: "confirm" }));

    const decided: BriefState = {
      draft: briefDraft,
      decisions: [
        { mappingId: "m1", decision: "confirm", briefId: "b1", decidedBy: "t1", decidedAt: "" },
        { mappingId: "m2", decision: "reassign", misconceptionId: "cold-flows", briefId: "b1", decidedBy: "t1", decidedAt: "" },
      ],
      open: [],
    };
    rerender(<BriefReview brief={decided} onDecide={onDecide} onSave={onSave} />);
    expect(screen.getByText('Reassigned to "Cold flows into things"')).toBeTruthy();
    const save = screen.getByRole("button", { name: "Save brief" });
    await waitFor(() => expect(save.hasAttribute("disabled")).toBe(false));
    fireEvent.click(save);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    const md = "# Misconception brief: ice\n\n## Metal is colder (1)";
    rerender(<BriefReview brief={{ ...decided, saved: { briefId: "b1", item: briefDraft.item, savedBy: "t1", savedAt: "", responses: 2, patterns: [], strengths: [], markdown: md } }} onDecide={onDecide} onSave={onSave} />);
    expect(screen.getByLabelText("Saved brief (Markdown)").textContent).toBe(md);
    expect(screen.queryByRole("button", { name: "Save brief" })).toBeNull();
  });
});
