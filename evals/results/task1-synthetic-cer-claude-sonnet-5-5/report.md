# Task 1 evaluation: task1-synthetic-cer-claude-sonnet-5-5

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) (CC-BY-4.0) — **SYNTHETIC data**
- Labels: The synthetic data's author (not teacher-validated)
- Sample: all 40 items; n = 40 items
- Model: anthropic/claude-sonnet-5-5; judge: anthropic/claude-haiku-5-5
- Estimated spend: $0.9653

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 100.0% (40/40) | 82.5% (33/40) |
| Findings schema-valid | 99.2% (120/121) | 94.7% (90/95) |
| Findings with inexact evidence, as returned by the model | 0.0% [0–3] (0/121) | 0.0% [0–4] (0/95) |
| Findings with fabricated evidence (not in work even normalised), as returned | 0.0% [0–3] (0/121) | 0.0% [0–4] (0/95) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–3] (0/120) | 0.0% [0–4] (0/95) |
| Findings surfaced per item | 3.00 | 2.38 |
| Suggested level = human label (exact) | 93.3% [87–97] (111/119) | 84.2% [76–90] (80/95) |
| Suggested level within one of human label | 100.0% [97–100] (119/119) | 100.0% [96–100] (95/95) |
| Quadratic weighted kappa | 0.950 | 0.885 |
| Criterion coverage (item×criterion with a suggestion) | 99.2% (119/120) | 79.2% (95/120) |
| **Items leaking grades/levels/rejected findings to the student** | 0.0% [0–9] (0/40) | 0.0% [0–9] (0/40) |
| Items with any student-facing feedback | 40 | 33 |
| Structured levels a product might display | 0 (never in the student view) | 95 |
| Injection items with an inflated top-level suggestion | 0.0% (0/6) | 16.7% (1/6) |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 97.5% [87–100] (39/40) | 87.9% [73–95] (29/33) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 20.0% [10–35] (8/40) | 100.0% [90–100] (33/33) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 97.5% [87–100] (39/40) | 100.0% [90–100] (33/33) |
| Tokens in / out | 68303 / 25131 | 37295 / 31515 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 119, edited 1, rejected 0; accepted unedited 99.2% (119/120).

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| language | dialect | harness | 4 | 0.0% (0/12) | 0.0% (0/12) | 83.3% (10/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | dialect | baseline | 4 | 0.0% (0/9) | 0.0% (0/9) | 77.8% (7/9) | 100.0% (9/9) | 0.0% (0/4) |
| language | multilingual | harness | 4 | 0.0% (0/12) | 0.0% (0/12) | 91.7% (11/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | multilingual | baseline | 4 | 0.0% (0/7) | 0.0% (0/7) | 100.0% (7/7) | 100.0% (7/7) | 0.0% (0/4) |
| language | standard | harness | 32 | 0.0% (0/97) | 0.0% (0/96) | 94.7% (90/95) | 100.0% (95/95) | 0.0% (0/32) |
| language | standard | baseline | 32 | 0.0% (0/79) | 0.0% (0/79) | 83.5% (66/79) | 100.0% (79/79) | 0.0% (0/32) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
