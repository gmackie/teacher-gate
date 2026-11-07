# Responsible AI

This page describes how Teacher Gate is designed to keep people in charge of AI feedback, what it
makes visible, what it can and cannot say about fairness, and its known limits. It describes the
design and the code. It does not report evaluation results, and it does not claim outcomes for
teachers or students: Teacher Gate has not been tested with teachers or students.

## Human oversight

The core rule is in code, not policy: **no model or agent can release feedback to a student or
assign a grade. Only a teacher acting directly can release, and every release records who and
when.**

- The teacher decides on every finding before release. There is no "accept all".
- The teacher can edit any finding into their own words; the student then sees the teacher's
  words.
- Model text that states a score or a level cannot be released until the teacher edits it.
- Suggested levels are shown to the teacher only. Teacher Gate never writes a grade.
- The teacher chooses the AI-help policy per activity: `none` (no model reads the work),
  `teacher-only` (advice to the teacher, never released) or `releasable`.
- Misconception briefs are saved only after the teacher confirms, rejects or reassigns every
  mapping.
- Language and reading-level variants reach a student only after a teacher approves them.
- Goal judgements (Task 4) are shown to staff only, and monitoring reports how often the AI agrees
  with the teacher so the teacher can decide how far to trust it.

Oversight takes teacher time. Whether teachers can review fast enough for this to be practical is
an open question that the [co-design sessions](codesign-kit/README.md) are designed to answer.
They have not been run.

## Transparency

What the teacher can see:

- Every finding's evidence, highlighted in the student's own words.
- The model's stated uncertainty (low, medium, high) for each finding.
- How many findings the verifier dropped, and why (for example "quote not found").
- Which model produced the draft (its label, such as `ollama/qwen2.5:7b`).
- Every preference shaping the draft (their selected criteria, their instructions, criteria
  they usually reject, their past edits used as style examples), each of which they can turn off.
- An audit log of every action, allowed and denied.

What the student sees: the released text, its evidence, and the notice "Drafted with AI and
reviewed by your teacher." A variant adds a notice that it was rewritten by AI and approved by the
teacher.

The model's "uncertainty" is what the model says about itself. It has not been calibrated.

## Bias and fairness

Language models can give less accurate or harsher feedback on writing in dialects or by
multilingual writers, and can mistake language features for weak reasoning.

What Teacher Gate does:

- **Subgroup reporting in the evaluation suite.** Task 1 reports every main measure for each
  value of each learner-group dimension a dataset provides (for ELLIPSE: gender, grade,
  race/ethnicity and SES; for the synthetic set: standard, dialect and multilingual writing). See
  [run on your own data](run-on-your-own-data.md).
- **Stratified sampling** so small groups are represented.
- **Teacher review of every released finding**, which is the main protection for any individual
  student.

Limits of that reporting:

- It shows **differences**, not causes. Group results carry wide intervals and are not
  significance tested.
- It covers only groups a dataset labels. Many datasets have no group labels; then no breakdown is
  possible and the report says so.
- Group labels in public datasets come from their sources. Teacher Gate never infers a student's
  group.
- The synthetic dialect and multilingual items were written by one author, not by speakers of
  those varieties, and their labels are not teacher-validated. They can find regressions; they
  cannot show that feedback is fair to real students.
- Agreement is measured against human labels, which can themselves carry bias.
- Nothing measures bias in what teachers release, or in how students receive it.

## Targeted Universalism

The universal goal: every student receives timely, specific feedback tied to what they were
taught, reviewed by their teacher.

Some groups face particular barriers to that goal. The table shows what exists in code for each,
and what does not.

| Group | Barrier | What exists | What does not |
|---|---|---|---|
| Multilingual learners and their families | Feedback in English they may not read | Translated variants of released feedback, approved by the teacher (`transform.ts`) | Any check of translation quality; automatic selection of a family's language |
| Students with reading difficulties | Dense written feedback | Reading-level variants (US grade 1–12), approved by the teacher; plain-text student view | A readability measure; any audio or read-aloud feature of its own |
| Students whose dialect or writing style differs from model training data | More inaccurate AI comments | Subgroup reporting; synthetic dialect and multilingual items; rubric-level evidence checks; teacher review | Evidence from real students that these help |
| Students using assistive technology | Interfaces that are hard to use | Reference components with semantic headings and keyboard focus between findings and evidence | A manual accessibility audit. Automated axe checks pass in CI; the WCAG 2.2 AA target has not been verified |

These features are meant to help every student, not only the group they were designed for.

## Known limitations

- **Not tested with teachers or students.** Nothing here shows that Teacher Gate saves teacher
  time or improves learning.
- **Verification is narrow.** It proves that evidence is real and that output has the right shape.
  It does not prove that an observation is correct, helpful or kind.
- **The model can ignore instructions.** Teacher instructions and style examples go into the
  prompt; criterion selection and deprioritised criteria are enforced in code.
- **Grade-language detection is a set of patterns** and can miss phrasings.
- **Synthetic data stands in for unreleased public goods.** Results on it measure the harness's
  mechanics, not classroom performance.
- **Text only.** No images, handwriting, audio or code.
- **English-centred.** Rubrics, prompts and synthetic data are in English. Exact-quote checks work
  in any language; nothing else has been tried in other languages.
- **No moderation model ships.** The default allows everything.
- **No class or tenant scoping.** The product must enforce who teaches whom.
- **Hosted models change.** The same model name may behave differently later.

## Accountability

Every action is in the audit log with its actor and outcome. Releases record the teacher and the
time. Evaluation runs record their configuration, seeds and git commit. Report problems through
the repository's issue tracker (or privately, for security issues; see
[security and privacy](security-and-privacy.md)).
