# Separate experiments

These runs are **not** part of the main results table. They test a proposed fix on a small
sample, and their numbers should not be pooled with the main runs.

## `exp-student-voice-ellipse-claude-haiku-5-5`: student-addressed, actionable wording

**Question.** On ELLIPSE, the harness arm passes the Learning Commons `revision-actionability`
judge far less often than direct prompting (Haiku: 10/79 vs 80/80; Sonnet: 2/79 vs 80/80). Is that
because the harness asks the model to write findings *for the teacher* ("You draft formative
feedback for a teacher…", "one specific observation a teacher could act on"), so released findings
describe the essay in the third person ("The essay uses…") and give no next step, while the
baseline asks for "feedback to the student"?

**Change.** No code change. The ELLIPSE activity gets one teacher instruction through the
existing `guidance.instructions` field, which the context builder already passes to the model:

> Write each observation to the student, addressing them as "you". In the second sentence, give
> one concrete next step the student can take in a revision, tied to the quoted words.

The baseline prompt is unchanged (it ignores teacher guidance).

**Setup.** Claude Haiku 5.5, judge Claude Haiku 5.5, ELLIPSE train split, stratified by
race/ethnicity, **10 per group (n = 40)**, seed 20261107, commit `d3a8406`. Both arms re-run on
this sample. This is a smaller sample than the main run (n = 80) and not the same items, so
compare the two arms *within* this experiment, not with the main table. Spend $0.3594.
Reproduce with [`../../scripts/experiment-student-voice.sh`](../../scripts/experiment-student-voice.sh).

**Result** (from `exp-student-voice-ellipse-claude-haiku-5-5/report.md`):

| Measure | Harness + instruction | Direct prompting |
|---|---|---|
| LC `revision-actionability` pass | 39/39 (100.0%) | 40/40 (100.0%) |
| LC `student-response-specificity` pass | 38/39 (97.4%) | 32/40 (80.0%) |
| LC `tone-appropriateness` pass | 39/39 (100.0%) | 40/40 (100.0%) |
| Inexact evidence reaching a person | 0/254 (0.0%) | 13/241 (5.4%) |
| Items leaking grades, levels or rejected findings | 0/40 (0.0%) | 0/40 (0.0%) |
| Suggested level = human label | 62/227 (27.3%) | 23/156 (14.7%) |

For comparison only (different items, n = 80): the main Haiku run's harness arm passed
actionability 10/79 (12.7%) and specificity 61/79 (77.2%).

**Reading.** On this sample, the instruction closed the actionability gap to a tie and put
specificity above the baseline, without giving up the verification and leakage results. It
supports the explanation that the loss came from findings written to the teacher. It does not
show the same for Sonnet or the open-weight models, which were not re-run, and the judge is an
unvalidated LLM.

**Proposed fix (not made in this change).** Either make student-addressed wording with one next
step the default in `FEEDBACK_INSTRUCTIONS` (`packages/core/src/context.ts`), or ship it as a
documented default teacher instruction. Changing the default prompt changes every Task 1 result,
so it should land with a full re-run across the four models.
