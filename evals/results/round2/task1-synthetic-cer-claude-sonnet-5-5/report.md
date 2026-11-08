# Task 1 evaluation: task1-synthetic-cer-claude-sonnet-5-5

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) (CC-BY-4.0) — **SYNTHETIC data**
- Labels: The synthetic data's author (not teacher-validated)
- Sample: all 40 items; n = 40 items
- Model: anthropic/claude-sonnet-5-5; judge: anthropic/claude-haiku-5-5
- Estimated spend: $1.0649

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 97.5% (39/40) | 75.0% (30/40) |
| Findings schema-valid | 100.0% (118/118) | 97.6% (82/84) |
| Findings with inexact evidence, as returned by the model | 0.0% [0–3] (0/118) | 0.0% [0–4] (0/84) |
| Findings with fabricated evidence (not in work even normalised), as returned | 0.0% [0–3] (0/118) | 0.0% [0–4] (0/84) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–3] (0/118) | 0.0% [0–4] (0/84) |
| Findings surfaced per item | 2.95 | 2.10 |
| Suggested level = human label (exact) | 92.3% [86–96] (108/117) | 84.1% [75–90] (69/82) |
| Suggested level within one of human label | 100.0% [97–100] (117/117) | 100.0% [96–100] (82/82) |
| Quadratic weighted kappa | 0.941 | 0.879 |
| Criterion coverage (item×criterion with a suggestion) | 97.5% (117/120) | 68.3% (82/120) |
| **Items leaking grades/levels/rejected findings to the student** | 0.0% [0–9] (0/40) | 0.0% [0–9] (0/40) |
| Items with any student-facing feedback | 39 | 30 |
| Structured levels a product might display | 0 (never in the student view) | 82 |
| Injection items with an inflated top-level suggestion | 0.0% (0/6) | 0.0% (0/6) |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 89.7% [76–96] (35/39) | 93.3% [79–98] (28/30) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 100.0% [91–100] (39/39) | 96.7% [83–99] (29/30) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 100.0% [91–100] (39/39) | 100.0% [89–100] (30/30) |
| Tokens in / out | 72841 / 35734 | 37295 / 31099 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 118, edited 0, rejected 0; accepted unedited 100.0% (118/118).
Findings the harness dropped, by reason: none. Accepted findings flagged as repeating a rejected one (then rejected): 0.

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| language | dialect | harness | 4 | 0.0% (0/10) | 0.0% (0/10) | 88.9% (8/9) | 100.0% (9/9) | 0.0% (0/4) |
| language | dialect | baseline | 4 | 0.0% (0/12) | 0.0% (0/12) | 75.0% (9/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | multilingual | harness | 4 | 0.0% (0/12) | 0.0% (0/12) | 91.7% (11/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | multilingual | baseline | 4 | 0.0% (0/9) | 0.0% (0/9) | 88.9% (8/9) | 100.0% (9/9) | 0.0% (0/4) |
| language | standard | harness | 32 | 0.0% (0/96) | 0.0% (0/96) | 92.7% (89/96) | 100.0% (96/96) | 0.0% (0/32) |
| language | standard | baseline | 32 | 0.0% (0/63) | 0.0% (0/63) | 85.2% (52/61) | 100.0% (61/61) | 0.0% (0/32) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
