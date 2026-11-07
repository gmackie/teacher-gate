# Task 1 evaluation: task1-synthetic-cer-claude-haiku-5-5

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) (CC-BY-4.0) — **SYNTHETIC data**
- Labels: The synthetic data's author (not teacher-validated)
- Sample: all 40 items; n = 40 items
- Model: anthropic/claude-haiku-5-5; judge: anthropic/claude-haiku-5-5
- Estimated spend: $0.2617

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 100.0% (40/40) | 100.0% (40/40) |
| Findings schema-valid | 99.2% (123/124) | 99.2% (119/120) |
| Findings with inexact evidence, as returned by the model | 1.6% [0–6] (2/124) | 0.8% [0–5] (1/120) |
| Findings with fabricated evidence (not in work even normalised), as returned | 0.8% [0–4] (1/124) | 0.0% [0–3] (0/120) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–3] (0/122) | 0.8% [0–5] (1/120) |
| Findings surfaced per item | 3.05 | 3.00 |
| Suggested level = human label (exact) | 89.9% [83–94] (107/119) | 81.7% [74–88] (98/120) |
| Suggested level within one of human label | 100.0% [97–100] (119/119) | 100.0% [97–100] (120/120) |
| Quadratic weighted kappa | 0.922 | 0.859 |
| Criterion coverage (item×criterion with a suggestion) | 99.2% (119/120) | 100.0% (120/120) |
| **Items leaking grades/levels/rejected findings to the student** | 0.0% [0–9] (0/40) | 2.5% [0–13] (1/40) |
| Items with any student-facing feedback | 40 | 40 |
| Structured levels a product might display | 0 (never in the student view) | 120 |
| Injection items with an inflated top-level suggestion | 16.7% (1/6) | 0.0% (0/6) |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 97.5% [87–100] (39/40) | 95.0% [83–99] (38/40) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 32.5% [20–48] (13/40) | 100.0% [91–100] (40/40) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 100.0% [91–100] (40/40) | 100.0% [91–100] (40/40) |
| Tokens in / out | 68309 / 45873 | 37295 / 53563 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 118, edited 4, rejected 0; accepted unedited 96.7% (118/122).

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| language | dialect | harness | 4 | 0.0% (0/12) | 0.0% (0/12) | 83.3% (10/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | dialect | baseline | 4 | 0.0% (0/12) | 0.0% (0/12) | 83.3% (10/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | multilingual | harness | 4 | 0.0% (0/12) | 0.0% (0/12) | 75.0% (9/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | multilingual | baseline | 4 | 0.0% (0/12) | 0.0% (0/12) | 83.3% (10/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | standard | harness | 32 | 2.0% (2/100) | 0.0% (0/98) | 92.6% (88/95) | 100.0% (95/95) | 0.0% (0/32) |
| language | standard | baseline | 32 | 1.0% (1/96) | 1.0% (1/96) | 81.3% (78/96) | 100.0% (96/96) | 3.1% (1/32) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
