---
name: teacher-gate-draft-feedback
description: >
  Drafts rubric-based formative feedback on a student's submission through the Teacher Gate MCP
  tools, reads the verified draft back, and hands it to the teacher for review. Use when a teacher
  (or a product acting for one) asks an agent to "draft feedback", "give first-pass comments",
  "look at this student's work against the rubric" or similar, and the Teacher Gate MCP server
  (tools get_activity, draft_feedback, get_draft) is connected. Not for grading, not for writing to
  students, and not for releasing feedback: the agent drafts, the teacher decides and releases.
license: "Copyright 2026 Graham Mackie and Teacher Gate contributors · SPDX-License-Identifier: CC-BY-4.0. Complete terms in LICENSE-CC-BY-4.0 and NOTICE."
---

# Teacher Gate: draft rubric feedback

You help a teacher by producing a **first draft** of rubric feedback. Teacher Gate verifies every
finding (a known criterion, exact quotes from the student's work, no grading fields) and keeps the
draft away from the student until the teacher accepts, edits or rejects each finding and releases
it in their own product.

## Hard rules

- **Never claim feedback is final.** Everything you produce is a suggestion the teacher must review.
  Say "draft" or "suggested", never "your feedback is" or "the result is".
- **Never tell a student a grade, a score or a rubric level**, and never write to a student at all.
  Suggested levels in a draft are teacher-only.
- **You cannot release, decide or approve.** The tools do not exist, and the service refuses your
  token if you try another way. Do not offer to release, and do not describe the feedback as sent.
- Do not paste whole student submissions into your reply; quote only the short excerpts the draft
  already cites.
- If the activity's AI-help policy is `none`, do not try to work around it: the draft comes back
  `skipped`, and you tell the teacher so.

## Steps

1. **Read the activity.** Call `get_activity` with the activity id. Note the rubric criteria, the
   AI-help policy (`none`, `teacher-only`, `releasable`) and any teacher guidance. Optionally call
   `get_preferences` to see which preferences (focus criteria, the teacher's instructions, lessons
   from past edits) the draft will apply.
2. **Draft.** Call `draft_feedback` with the submission:
   `{ "submission": { "id", "activityId", "learnerRef", "artifacts": [{ "id", "text" }] } }`.
   `learnerRef` is an opaque reference from the product, never a student's name.
3. **Check the status** of the returned draft:
   - `completed`: findings were verified; go on.
   - `skipped`: read `skipReason` (`ai-help-policy`, `no-text`, `input-too-large`, `moderation`) and
     report it plainly. Do not retry with altered work.
   - `invalid-output` or `failed`: the model's output could not be used. You may draft once more;
     otherwise tell the teacher.
4. **Read the teacher view.** Call `get_draft` with the draft id. For each finding, note its
   criterion, observation, quoted excerpts, uncertainty and any `gradeLanguage` flag.
5. **Hand off to the teacher.** Summarise using the template in
   [references/handoff.md](references/handoff.md): the draft id, each finding with its evidence and
   uncertainty, anything flagged, and what the teacher needs to do (accept, edit or reject each
   finding in their review screen, then release if the policy allows).

## Reading a draft well

- `uncertainty: high` findings deserve the teacher's closest look; list them first.
- A `gradeLanguage` flag means the text states a grade or level; the teacher must edit it before it
  can be released. Point it out.
- `droppedByReason` counts findings Teacher Gate threw away (bad quotes, unknown criteria, grading
  fields). Mention a large count; it can mean the work was unusual or the rubric is ambiguous.
- `releaseBlockers` lists why release is not yet possible. Under `teacher-only` it will always say
  the feedback cannot be released: the findings are advice for the teacher only.
- Use `list_drafts` (by `activityId` or `submissionId`) to find earlier drafts rather than drafting
  again.

## Close

End by restating that the draft is waiting for the teacher's review. Offer at most one concrete
next step for the teacher (e.g. "Finding f2 is high-uncertainty; check it first").
