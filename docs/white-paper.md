# Teacher Gate: keeping teachers in control of AI formative feedback

*Technical white paper, draft 0.2, November 2026. Licensed CC-BY-4.0. Code Apache-2.0 at
<https://github.com/gmackie/teacher-gate>.*

> **Status of this draft.** Every number here comes from the run folders in
> [`evals/results/`](../evals/results/) and the generated table
> [`evals/results/RESULTS.md`](../evals/results/RESULTS.md). The only real student data is the
> ELLIPSE corpus (Task 1). Tasks 2–4 and half of Task 1 use **synthetic** data written by the
> authors as placeholders for public goods that have not been released yet. No teacher has used
> the system in these evaluations: teacher decisions are simulated by rules, and feedback quality
> is scored by a language model acting as a judge. Read the results as evidence about the
> mechanism, not about classroom outcomes.

## 1. Summary

Teacher Gate is a library and HTTP service that sits between a language model and an education
product. The product asks Teacher Gate for formative feedback instead of calling the model
directly. The model's findings are checked in code (schema, exact quotes from the student's work,
valid rubric criteria and levels), shown only to the teacher, and reach the student only after the
teacher accepts or edits each one and releases them. Grades and suggested levels never reach the
student view.

We compared the harness with direct prompting (the same model, rubric and work, one prompt, output
shown to the student as returned) on 80 English-learner essays from ELLIPSE with four models
(Claude Haiku 5.5, Claude Sonnet 5.5, Qwen 2.5 7B, Llama 3.1 8B), and on synthetic data for all
four of the program's tasks. The results go both ways:

- **What the harness does well, on real data.** No finding with inexact or fabricated evidence
  reached a person in any harness run (0 of 362–484 surfaced findings per model), against
  2.3%–28.4% of findings under direct prompting. Grades, levels or rejected text reached students
  in 0 of 80 essays for three models; direct prompting leaked in 2–3 of 80 for the same three.
  The share of findings that were schema-valid rose sharply for the open-weight models
  (Qwen 48.8% → 99.8%, Llama 55.4% → 96.0%).
- **What it does worse, on real data.** The feedback students would receive scored much lower on
  the Learning Commons *revision-actionability* judge for every model (for example Haiku 100.0% →
  12.7%, Sonnet 100.0% → 2.5% of essays passing), and lower on *specificity* for every model.
  Agreement between the model's suggested level and the human raters' scores was lower under the
  harness for three of four models. For Llama the harness let rejected wording reach students in
  3 of 80 essays, where direct prompting leaked none.
- **A likely fix, tested on a small sample.** The harness prompt asks the model to write for the
  teacher, so released findings describe the essay in the third person and give no next step.
  Adding one teacher instruction ("address the student as 'you'; give one concrete next step")
  through the existing guidance field brought Haiku's actionability to 39 of 39 essays (direct
  prompting: 40 of 40) and specificity to 38 of 39 (direct prompting: 32 of 40), on a separate
  40-essay sample. This is a separate experiment, not a replacement for the main results.
- **Round 2, after three fixes (§5.7).** We made student-addressed wording the default, enforced
  learned teacher preferences in code, and removed duplicate findings. We then re-ran every task with
  the same data, seeds and judge for Haiku, Sonnet and Qwen. Llama's re-run was stopped unfinished
  and is not reported. On real essays, actionability rose to 79/79 for Haiku and Sonnet (a tie with
  direct prompting) and to 48/77 for Qwen (direct prompting: 22/80). Inexact evidence reaching a person
  and leakage stayed at zero. Findings on a criterion the teacher always rejects fell to zero for all
  three models (round 1: 15/15, 8/40 and 16/42). Specificity is still slightly below direct prompting
  for Sonnet and Qwen, and agreement with human scores is still lower for Haiku and Sonnet.

Total hosted spend for round 1, the experiment and diagnostics was **$8.08**. Round 2 brought the
total to **$15.86** (estimated from token counts and list prices), under a $40 cap.

## 2. The problem

Developers adding AI feedback to classroom products face three recurring failures:

1. **Invented evidence.** Models quote words the student did not write, or paraphrase inside a
   quote, and then build feedback on the invented text.
2. **Leaking judgements.** Models given a rubric volunteer levels or grades in student-facing
   prose, and products that keep a structured `suggestedLevel` field can display it.
3. **No teacher in the loop.** The student sees whatever the model returns. A teacher who
   disagrees finds out afterwards, if at all, and nothing they say shapes the next draft.

Prompting alone does not prevent any of these reliably, because a prompt is a request, not a
check. Teacher Gate moves the checks into code and the decisions to the teacher.

## 3. Design

A product calls Teacher Gate with an activity (rubric, objectives, teacher guidance, AI help
policy) and a student's work. Six steps follow; the teacher controls steps 4 and 5.

1. **Context.** The context builder assembles only what the task needs: the selected rubric
   criteria, objectives, the teacher's instructions and matching misconception entries. The
   student's work is wrapped in an untrusted-content boundary so instructions inside it are
   treated as data. Work over the size limit is skipped, never silently truncated. If the
   activity's AI help policy is `none`, no model call is made.
2. **Model.** Any provider through an adapter: Anthropic, OpenAI-compatible, vLLM or Ollama, with
   the developer's own keys or fully local.
3. **Verify.** Code, not prompts: the output must parse against the finding schema; every excerpt
   must appear in the work exactly, character for character, at a resolvable range; criteria and
   levels must exist in the rubric; there is no grade or approval field. Findings that fail are
   dropped and recorded as dropped.
4. **Teacher review.** The teacher sees each finding with its evidence highlighted in the work, the
   suggested level and the model's uncertainty, and accepts, edits or rejects it.
5. **Release.** Only a teacher can release, and only accepted or edited findings are released. The
   release records who and when.
6. **Student view.** A filter builds what the student sees from the release alone. Levels, rejected
   findings, rejected criteria, uncertainty and model details are excluded, and an independent
   check (`findLeaks`) inspects the final payload for any of them.

Teacher decisions are stored and steer later drafts (Task 3): criteria the teacher usually rejects
are deprioritized and the teacher's edits become style examples, and the teacher can see which
preferences were applied. Teacher goals (Task 4) become model judgements of student work with
quoted evidence, are dry-run on past work, and are then tracked for agreement with the teacher's
own judgements and for drift. Released feedback can be rewritten to a reading level or translated,
with the teacher approving the variant. Moderation is a pluggable interface. The harness logs
identifiers and decisions, not student text. It is also exposed as an MCP server and as agent
skills, with reference React components for the teacher review and student view.

The [architecture](architecture.md) and [security and privacy](security-and-privacy.md) documents
give the details.

## 4. Methods

### 4.1 Tasks and data

| Task | What is measured | Data | Real or synthetic |
|---|---|---|---|
| 1 Verifiable rubric feedback | Evidence fidelity, schema validity, agreement with human scores, leakage, judged feedback quality | ELLIPSE train split: grade 8–12 English-learner essays with six analytic scores (cohesion, syntax, vocabulary, phraseology, grammar, conventions) averaged over two trained raters, and gender, grade, race/ethnicity and economic-status labels. CC BY 4.0 | **REAL** |
| 1 (second set) | The same | 40 claim-evidence-reasoning paragraphs on ice melting on metal and plastic plates, written and labelled by the authors as a placeholder for Playlab's CER data, including injection attempts | **SYNTHETIC** |
| 2 Class misconception brief | Precision and recall of mappings from responses to a misconception catalog; evidence fidelity; invented misconceptions | 3 class sets, 42 responses, 15 catalog entries, written and labelled by the authors as a placeholder for Learning Equality's maps | **SYNTHETIC** |
| 3 Teacher guidance shapes later drafts | Whether a rule-based simulated teacher's rejections and edits change later drafts | The synthetic CER set; simulated teacher | **SYNTHETIC**, simulated |
| 4 Teacher goals and monitoring | Agreement between the goal judge and a stand-in teacher judgement | The synthetic CER set; the author's evidence label stands in for the teacher | **SYNTHETIC**, simulated |

The public goods named in the proposal for these tasks (Playlab CER, National Trail, Pitt
multi-draft essays, Learning Equality maps, Quill feedback examples, KB-TutorBench) were not
downloadable when these runs were made; see [public goods](public-goods.md). ELLIPSE is used
because it is openly licensed, has human analytic scores and carries demographic labels.

### 4.2 Arms

- **Harness:** the full Teacher Gate path in §3, with a simulated teacher at step 4.
- **Baseline (direct prompting):** the same model, rubric and work in one prompt, written as a
  careful developer would: it asks for exact quotes and says not to grade the student. No
  boundary, no verification, no teacher; the `observation` text is what the student sees.

For Task 3 the comparison is the harness with learning off against learning on. Task 4 has a
single arm and no baseline.

### 4.3 Simulated teacher

No real teachers took part. For Task 1 the simulated teacher uses the human scores: it **rejects**
a finding whose suggested level is two or more levels from the human label, **edits** out any
sentence that states a grade or level, and **accepts** the rest. For Task 3 it rejects every finding
on the `claim` criterion and rewrites every other finding to start with "Next step:". These rules
are crude stand-ins; real teachers accept, edit and reject for many more reasons.

### 4.4 Models, judge and settings

- Models: `anthropic/claude-haiku-5-5`, `anthropic/claude-sonnet-5-5` (hosted; the API takes no
  sampling parameters for these models), `ollama/qwen2.5:7b` and `ollama/llama3.1:8b` (local,
  temperature 0, seed 42, 16k context). Maximum output 2,000 tokens. No retries.
- Judge (Task 1 only): three Learning Commons feedback evaluators for grade 6–12 ELA writing
  (`student-response-specificity`, `revision-actionability`, `tone-appropriateness`), prompts
  pinned at commit `e1b5dfb`, run on Claude Haiku 5.5. Each returns pass or fail for the full set
  of student-facing feedback on one essay. **Deviation:** Learning Commons validated these prompts
  with OpenAI gpt-5.4 at temperature 1 on Quill "because" completions. Our judge model and data
  differ and have not been validated against teacher labels.
- What the judge sees: for the harness, only the findings the simulated teacher released; for the
  baseline, every observation returned. Essays with no released feedback are excluded from the
  judge's denominator (this is why the harness has 79, 66 or 61 essays where the baseline has 80
  or 76).

### 4.5 Sampling, measures and statistics

- ELLIPSE: 80 essays, stratified by race/ethnicity: 20 each of Hispanic/Latino, Asian/Pacific
  Islander, Black/African American and White, drawn with seed 20261107. Both arms see the same
  essays. The item ids are in each run's `config.json`.
- Synthetic CER: all 40 paragraphs. Task 3: 24 paragraphs without injection attempts, the first 8
  as warm-up. Task 4: all 40.
- Measures are defined in [run on your own data](run-on-your-own-data.md). "Inexact evidence"
  means a quote that is not an exact substring of the work; "fabricated" means it is not found
  even after normalising case, whitespace and punctuation. "Reaching a person" counts findings
  surfaced to the teacher (harness) or student (baseline). Agreement compares the model's
  suggested level with the human label rounded to the rubric scale, over the item×criterion pairs
  where the model suggested one.
- Rates carry 95% Wilson intervals. We did not run significance tests, and we did not correct for
  multiple comparisons. Where intervals overlap we say so.

### 4.6 Reproducing

```sh
pnpm install
export ANTHROPIC_API_KEY=...   # hosted models and the judge
ollama pull qwen2.5:7b && ollama pull llama3.1:8b
RESULTS=/tmp/tg-results ./evals/scripts/run-all.sh
```

Task 1 and Task 2 results were produced at commit `975da0c`; Tasks 3 and 4 and the experiment at
`d3a8406`. Check out the matching commit to reproduce a run exactly. Hosted model outputs vary
between calls even at the same commit. ELLIPSE and the judge prompts are downloaded from pinned
commits and checked against SHA-256 hashes.

## 5. Results

`RESULTS.md` has every measure for every run (148 rows), with the 73 rows where the harness loses
or ties listed separately. This section summarises.

### 5.1 Task 1 on real essays (ELLIPSE, n = 80 per model)

Baseline → harness. Bold marks a measure where the harness is worse.

| Measure | Haiku 5.5 | Sonnet 5.5 | Qwen 2.5 7B | Llama 3.1 8B |
|---|---|---|---|---|
| Findings with inexact evidence, as returned | 5.2% → 3.4% | 2.3% → 1.2% | **14.2% → 15.6%** | 28.4% → 20.8% |
| Findings with fabricated evidence, as returned | 3.7% → 1.8% | 1.7% → 0.8% | **10.0% → 11.5%** | 20.4% → 14.2% |
| Inexact evidence reaching a person | 25/481 → 0/484 | 11/480 → 0/473 | 67/471 → 0/405 | 124/437 → 0/362 |
| Findings schema-valid | 99.8% → 100.0% | 99.2% → 99.6% | 48.8% → 99.8% | 55.4% → 96.0% |
| Suggested level = human label | 17.0% → 22.6% | **22.2% → 15.3%** | **22.0% → 15.1%** | **28.5% → 8.4%** |
| Suggested level within one | 70.9% → 76.3% | **82.4% → 74.2%** | **69.3% → 56.8%** | **83.5% → 44.9%** |
| Quadratic weighted kappa | 0.163 → 0.182 | **0.255 → 0.209** | **0.067 → 0.046** | 0.118 → 0.129 |
| Item×criterion pairs with a suggested level (of 480) | 282 → 464 | 465 → 472 | 218 → 405 | 242 → 345 |
| Essays leaking grade, level or rejected text to the student | 3/80 → 0/80 | 2/80 → 0/80 | 2/80 → 0/80 | **0/80 → 3/80** |
| Judge: specificity pass | **92.5% → 77.2%** | **83.8% → 65.8%** | **56.3% → 27.3%** | **15.8% → 9.8%** |
| Judge: revision-actionability pass | **100.0% → 12.7%** | **100.0% → 2.5%** | **35.0% → 4.5%** | **6.6% → 0.0%** |
| Judge: tone pass | 100.0% → 100.0% | 100.0% → 100.0% | **97.5% → 97.0%** | **96.1% → 90.2%** |
| Simulated teacher accepted unedited (harness) | 77.1% | 74.0% | 56.8% | 47.5% |
| Estimated spend (model + judge) | $0.75 | $3.50 | $0.57 | $0.38 |

Counts and intervals for every cell are in `RESULTS.md`.

**Evidence.** Verification removes every finding whose evidence is not exactly in the work, so
"reaching a person" is zero for the harness by construction; it is the measure a student or
teacher actually experiences. What the model *produces* is a separate question. Under the harness
prompt, three models produced fewer inexact and fabricated quotes than under direct prompting, but
Qwen produced slightly more (intervals overlap). Llama's raw rate stayed high (20.8%) even with the
harness, which means the teacher sees fewer findings: 4.5 per essay against 5.5 under direct
prompting.

**Leakage.** For Haiku, Sonnet and Qwen the harness leaked nothing, while direct prompting leaked
level or grade language into student-facing prose in 2–3 essays per model, and returned a
structured `suggestedLevel` on 282–480 findings per model that a product could display. For Llama the harness
leaked rejected text in 3 of 80 essays. In all three Llama wrote the same sentence word for word
under two criteria; the simulated teacher rejected one copy and accepted the other, so the rejected
words reached the student through the accepted finding. The harness does not de-duplicate
identical findings across criteria, and this is a real gap.

**Agreement with human scores.** The harness asks for a suggested level on every criterion and the
baseline does not, so the harness is scored on more pairs (for example Haiku 464 of 480 against 282)
and the two arms' agreement rates cover different pairs. With that caveat, the harness agreed less
often with the human raters for Sonnet, Qwen and Llama, and more often for Haiku. Llama's within-one
agreement fell from 83.5% to 44.9%. We did not investigate why. Agreement is low for every model
and arm (kappa 0.05–0.26): these essays were scored by trained raters on a 1–5 scale, and the
rubric's levels are coarse.

**Judged feedback quality.** This is the clearest loss. The judge passed the harness's
student-facing feedback for actionability on 0–12.7% of essays, against 6.6–100% for direct
prompting, and for specificity on 9.8–77.2% against 15.8–92.5%. The harness prompt tells the model
it is drafting for a teacher ("one specific observation a teacher could act on"); the released
findings read as descriptions of the essay ("The essay uses some clear transitions…") with no next
step, while the baseline prompt asks for "feedback to the student" and gets second-person advice.
§5.6 tests this explanation.

### 5.2 Task 1 on synthetic paragraphs (SYNTHETIC, n = 40 per model)

On the authors' own CER paragraphs, which are short and written to match the rubric, every model
agreed with the author labels far more often (exact agreement 40.4%–93.3%), and the harness agreed more
often than direct prompting for all four models (for example Sonnet 84.2% → 93.3%, Llama 40.4% →
61.4%). Within-one agreement was 96–100% in both arms; the harness was slightly lower for Llama
and Qwen. Inexact evidence reaching a person was 0 in every harness run and 0–5 of 95–120 findings
under direct prompting. The actionability loss appeared here too: 100% → 32.5% (Haiku), 100% →
20.0% (Sonnet), 72.5% → 25.0% (Qwen), 57.5% → 12.5% (Llama). Sonnet's direct-prompting arm failed
to parse on 7 of 40 paragraphs; the harness parsed all 40. Because the data is synthetic and
author-labelled, these numbers show the mechanism works, not how it performs on students' writing.

### 5.3 Task 2: class misconception brief (SYNTHETIC)

| Model | Precision | Recall | F1 | Mappings with a quote not in the response (as returned) | Such mappings reaching the teacher | Invented misconceptions |
|---|---|---|---|---|---|---|
| Haiku 5.5 | 94.7% → 97.3% | 94.7% → 94.7% (tie) | 0.947 → 0.960 | 1/40 → 0/37 | 1/40 → 0/37 | 0 → 0 (tie) |
| Sonnet 5.5 | 97.4% → 100.0% | **100.0% → 94.7%** | **0.987 → 0.973** | 0/39 → 0/39 (tie) | 0/39 → 0/36 (tie) | 0 → 0 (tie) |
| Qwen 2.5 7B | 40.0% → 62.5% | **42.1% → 26.3%** | **0.410 → 0.370** | **7/40 → 22/42** | 7/40 → 0/16 | **5/40 → 12/42** |
| Llama 3.1 8B | 62.5% → 100.0% | **65.8% → 55.3%** | 0.641 → 0.712 | 5/40 → 3/24 (12.5% both) | 5/40 → 0/21 | 10/40 → 2/24 |

Baseline → harness, before the teacher's confirmation step (which in the harness would remove
wrong mappings). The harness raised precision for every model and removed every bad-evidence
mapping before the teacher saw it. It lowered recall for three models, because verification drops
mappings whose quotes are wrong even when the misconception is right; for Qwen it dropped so many
that F1 fell. Under the harness prompt Qwen also returned more bad quotes and more invented
misconception ids than under direct prompting.

### 5.4 Task 3: teacher guidance shapes later drafts (SYNTHETIC, simulated teacher)

Learning off → learning on, 16 paragraphs after an 8-paragraph warm-up.

| Model | Findings on the always-rejected criterion | Findings accepted unedited | Findings already in the teacher's style |
|---|---|---|---|
| Haiku 5.5 | **32.6% → 100.0%** (15/46 → 15/15) | 0% → 0% (tie) | 0% → 0% (tie) |
| Sonnet 5.5 | 34.0% → 20.0% | 0% → 40.0% | 0% → 47.5% |
| Qwen 2.5 7B | **34.8% → 38.1%** | 0% → 0% (tie) | 0% → 0% (tie) |
| Llama 3.1 8B | **32.6% → 36.6%** | 0% → 0% (tie) | 0% → 0% (tie) |

The learning loop worked for Sonnet only. For Qwen and Llama it changed nothing measurable. For
Haiku it backfired: once preferences were applied, Haiku returned **one finding per paragraph, on
the very criterion the prompt asked it to deprioritize**, and ignored the style examples. We
reproduced this twice (no findings were dropped by verification; the raw output contained one
`claim` finding). The cause is that preferences reach the model only as prompt text ("The teacher
usually rejects suggestions on these criteria; comment on them only when the evidence is strong")
and Haiku inverts it. Deprioritization should be enforced in code, for example by removing
deprioritized criteria from the requested set or ranking their findings last, rather than left to
the model.

### 5.5 Task 4: teacher goals (SYNTHETIC, author label as the teacher, no baseline)

Goal: "Uses measured data from the investigation as evidence for the claim", on the `evidence`
criterion, 40 paragraphs.

| Model | Agreement | Cohen's kappa | Unverified judgements | tp / fp / fn / tn |
|---|---|---|---|---|
| Haiku 5.5 | 90.0% (36/40) | 0.794 | 0/40 | 22 / 0 / 4 / 14 |
| Sonnet 5.5 | 85.0% (34/40) | 0.700 | 0/40 | 20 / 0 / 6 / 14 |
| Qwen 2.5 7B | 82.1% (32/39) | 0.618 | 1/40 | 21 / 2 / 5 / 11 |
| Llama 3.1 8B | 42.5% (17/40) | 0.084 | 0/40 | 3 / 0 / 23 / 14 |

Every model erred towards "goal not met"; Llama almost always did. There is no direct-prompting
arm, so these numbers say how well each model judges this goal, not what the harness adds.

### 5.6 Separate experiment: student-addressed wording

To test the explanation in §5.1, we re-ran Task 1 with Haiku on a separate stratified sample of 40
ELLIPSE essays (10 per race/ethnicity group, same seed, commit `d3a8406`), adding one teacher
instruction through the existing `guidance.instructions` field, with no code change:

> Write each observation to the student, addressing them as "you". In the second sentence, give
> one concrete next step the student can take in a revision, tied to the quoted words.

| Measure | Harness + instruction | Direct prompting |
|---|---|---|
| Judge: actionability pass | 39/39 (100.0%) | 40/40 (100.0%) |
| Judge: specificity pass | 38/39 (97.4%) | 32/40 (80.0%) |
| Judge: tone pass | 39/39 (100.0%) | 40/40 (100.0%) |
| Inexact evidence reaching a person | 0/254 | 13/241 (5.4%) |
| Essays leaking to the student | 0/40 | 0/40 |
| Suggested level = human label | 27.3% | 14.7% |

Spend $0.36. The instruction closed the actionability gap to a tie and put specificity above
direct prompting, without losing the verification or leakage results. The sample is smaller than
the main run and not the same essays, only Haiku was tested, and the judge is unvalidated. Details:
[`evals/results/experiments/README.md`](../evals/results/experiments/README.md).

### 5.7 Round 2: after the three fixes

Round 2 (commit `132c1c6`, PR #9) changed three things and nothing else:

- findings address the student as "you", with one concrete next step, by default;
- criteria the teacher keeps rejecting are held back in code, not only described in the prompt;
- near-duplicate findings are removed, and release is blocked when an accepted finding repeats
  rejected text.

We re-ran every task with the same datasets, samples, seeds, n and judge. Haiku, Sonnet and Qwen
finished. **Llama's round 2 was stopped unfinished**, at 60 of 160 calls on Task 1, to close out
the evaluation. It is not reported, and its round 1 results stand. Hosted outputs vary between
runs, so Tasks 2 and 4 serve as a noise check: the fixes did not change their prompts.

Task 1, real essays (ELLIPSE, n = 80). Each cell is round 1 → round 2 for the harness, with
round 2 direct prompting in brackets.

| Measure | Haiku 5.5 | Sonnet 5.5 | Qwen 2.5 7B |
|---|---|---|---|
| Judge: actionability | 10/79 → **79/79** [79/79] | 2/79 → **79/79** [80/80] | 3/66 → **48/77** [22/80] |
| Judge: specificity | 61/79 → **70/79** [61/79] | 52/79 → 70/79 [71/80] | 18/66 → 43/77 [46/80] |
| Judge: tone | 79/79 → 79/79 [79/79] | 79/79 → 79/79 [80/80] | 64/66 → 77/77 [77/80] |
| Inexact evidence reaching a person | 0 → 0 [23/486] | 0 → 0 [13/480] | 0 → 0 [63/473] |
| Essays leaking to the student | 0 → 0 [3/80] | 0 → 0 [5/80] | 0 → 0 [2/80] |
| Quadratic weighted kappa | .182 → .209 [.220] | .209 → .225 [.269] | .046 → **.174** [.073] |

Tasks 2–4 (synthetic):

| Measure | Haiku 5.5 | Sonnet 5.5 | Qwen 2.5 7B |
|---|---|---|---|
| Task 3: findings on the always-rejected criterion reaching the teacher (learning on) | 15/15 → **0/31** | 8/40 → **0/32** | 16/42 → **0/33** |
| Task 2: F1 (prompt unchanged; noise check) | .960 → .960 [.987] | .973 → .959 [.974] | .370 → .456 [.410] |
| Task 4: agreement (prompt unchanged; noise check) | 90.0% → 85.0% | 85.0% → 87.5% | 82.1% → 81.6% |

What got better:

- **Actionability:** rose for every model. It now ties direct prompting for Haiku and Sonnet, and
  is well above it for Qwen.
- **Specificity:** now beats direct prompting for Haiku.
- **Task 3 inversion:** fixed. Nothing on a rejected criterion reached the teacher for any model.
- **Qwen's agreement with human scores:** kappa rose from .046 to .174, above direct prompting.

What is still worse or unchanged:

- **Specificity** is slightly below direct prompting for Sonnet (70/79 vs 71/80) and Qwen (43/77
  vs 46/80). Both intervals overlap.
- **Agreement with human scores** (kappa) is still below direct prompting for Haiku (.209 vs .220)
  and Sonnet (.225 vs .269).
- **Synthetic Task 1:**
  - Kappa fell slightly for all three models from round 1 (e.g. Haiku .922 → .881).
  - Haiku's specificity fell from 39/40 to 37/40.
  - Sonnet's fell from 39/40 to 35/39.
- **Task 2 and Task 4** moved within the range expected from run-to-run variation, since their
  prompts did not change. Haiku's Task 4 kappa fell from .794 to .691 on an unchanged prompt.
- **Llama:** not re-run, so we cannot say whether the de-duplication fix removes its round 1 leak
  in an end-to-end run. It is covered by a regression test only.

### 5.8 Every loss and tie in round 1, in brief

- **Judged quality (Task 1):** actionability and specificity worse for every model on real data;
  actionability worse for every model on synthetic data; tone tied (Haiku, Sonnet) or slightly
  worse (Qwen, Llama) on real data.
- **Agreement with human scores (Task 1, real):** worse for Sonnet, Qwen and Llama on exact and
  within-one; kappa worse for Sonnet and Qwen.
- **Raw evidence quality (Task 1):** Qwen produced slightly more inexact and fabricated quotes
  under the harness on real data; Haiku did on synthetic data (2 vs 1, intervals overlap).
- **Leakage (Task 1, real):** Llama leaked rejected text in 3 of 80 essays under the harness, none
  under direct prompting.
- **Task 2:** recall worse for Sonnet, Qwen and Llama; F1 worse for Sonnet and Qwen; Qwen's raw bad
  quotes and invented misconceptions higher under the harness.
- **Task 3:** learning made Haiku worse and did nothing measurable for Qwen and Llama.
- **Ties** on measures already at the ceiling or floor (output parsed, tone, invented
  misconceptions at zero) are listed in `RESULTS.md`.

## 6. Fairness

ELLIPSE lets us break Task 1 down by race/ethnicity (4 groups of 20 essays), gender, grade (8, 11
and 12; grades 9 and 10 have 2 essays each and are excluded from gap figures) and economic status.
`RESULTS.md` lists, for every model, dimension and measure, the gap between the highest and lowest
group in each arm.

What the data shows:

- **Evidence reaching a person** was 0% for every group under the harness, so its gap was zero in
  all 16 model×dimension comparisons. Under direct prompting the gap reached 15.5 points (Llama,
  race/ethnicity: 20.2% of findings for White students' essays vs 35.7% for Hispanic/Latino
  students' essays).
- **Leakage to students** had a zero gap under the harness for Haiku, Sonnet and Qwen; for Llama
  the three leaking essays produced gaps of 4.7–10.0 points.
- **Agreement with human scores** showed no consistent direction. The harness gap was narrower in
  8 and wider in 7 of 16 comparisons for exact agreement, and narrower in 7 and wider in 8 for
  within-one. On race/ethnicity the harness narrowed the exact-agreement gap for Sonnet (12.0 →
  1.4 points) and Qwen (22.6 → 10.4) and widened it for Haiku (6.2 → 11.3).
- **Raw inexact evidence** gaps were wider under the harness in 11 of 16 comparisons, although the
  overall rate was lower for three of four models.

What the data cannot show:

- **Whether any of these gaps is real.** With 20 essays per race/ethnicity group the intervals are
  wide, and we ran no significance tests. A narrower gap can come from every group getting worse.
- **Judged quality by group.** The Learning Commons judge results are not broken down by group.
- **Dialect, multilingual status or disability.** ELLIPSE contains only English-learner essays, so
  there is no English-learner vs non-English-learner comparison, and it carries no dialect or
  disability labels. The roadmap's planned comparison on ASAP 2.0 (English learners vs others) is
  not done.
- **Fairness of the human labels.** Agreement is measured against two raters' scores, which may
  carry their own bias; matching them is not the same as being fair.
- **Anything about real teachers.** Teacher decisions were simulated from the same human scores.

## 7. Limitations

1. **Synthetic data.** Tasks 2, 3 and 4 and half of Task 1 use data the authors wrote and labelled
   themselves. It is short, clean and written to fit the rubric, which inflates agreement and
   makes the tasks easier than real classrooms. It stands in for public goods that were not
   released when these runs were made, and every report labels it.
2. **LLM-as-judge.** Feedback quality is scored by Learning Commons' prompts run on Claude Haiku
   5.5, not the model they were validated on and not on the data they were validated on. The judge
   is from the same model family as two of the models judged. Its pass/fail scores are not
   teacher judgements, and the large actionability effect may partly reflect the judge's own
   preference for second-person phrasing.
3. **No teachers.** Every accept, edit and reject was made by a rule. Review time, the roadmap's
   measure of teacher effort, was not measured at all; it needs timed co-design sessions with
   teachers.
4. **Small samples, many comparisons.** n = 80 essays (or 40 paragraphs) per model; 148 measures;
   no significance tests and no correction for multiple comparisons.
5. **Different denominators.** The harness suggests levels on more criteria and releases fewer
   findings than direct prompting, so agreement and judge rates are computed over different sets
   of pairs and essays in the two arms.
6. **Hosted models are not reproducible call for call.** The Anthropic models take no sampling
   parameters; a re-run will differ. Local runs use temperature 0 and a fixed seed.
7. **One baseline.** Direct prompting here is one reasonable prompt. A developer could write a
   better one, for instance with their own quote checking, and narrow the evidence gap.
8. **Record gaps.** Tasks 2–4 write no `config.json`; their commits are recorded in
   `evals/results/README.md` and the reproduction script. Tasks 3 and 4 keep aggregates only. The
   aborted first Qwen ELLIPSE attempt's judge spend is an estimate ($0.13).
9. **Models.** Four models, two of them small open-weight models. No OpenAI or vLLM-served models
   were evaluated, although adapters exist.

## 8. Next steps

1. **Done in round 2 (§5.7):**
   - student-addressed default wording;
   - preferences enforced in code;
   - de-duplication, with release blocked on repeated rejected text.
2. **Re-run Llama** end to end with the round 2 fixes, to confirm the leak fix outside the
   regression test.
3. **Close the remaining specificity gap** for Sonnet and Qwen.
4. **Investigate the agreement loss** for Sonnet and the open-weight models: separate the effect of
   coverage (more criteria scored) from the effect of the prompt.
5. **Swap placeholders for real public goods** as Playlab, Learning Equality, National Trail, Pitt
   and Quill release them, and add ASAP 2.0 for an English-learner comparison.
6. **Validate the judge** against teacher labels, or run the Learning Commons evaluators on their
   validated model, and break judge results down by group.
7. **Measure with teachers.** Review time, acceptance and edits from real teachers in co-design
   rounds, under the release checklist's privacy and IRB steps.
8. **Run the suite per adapter in CI** on a fixed small sample, and publish results per model with
   each release.

## Licensing and citation

This paper and the results in `evals/results/` are CC-BY-4.0. Teacher Gate's code is Apache-2.0.
ELLIPSE: Crossley, S. A., Tian, Y., Baffour, P., Franklin, A., Kim, Y., Morris, W., Benner, B.,
Picou, A., & Boser, U. (2023). Measuring second language proficiency using the ELLIPSE Corpus.
*International Journal of Learner Corpus Research*, 9(2), 248–269 (CC BY 4.0). Learning Commons
Evaluators: <https://github.com/learning-commons-org/evaluators> (prompts CC BY 4.0). Cite
Teacher Gate using [`CITATION.cff`](../CITATION.cff).
