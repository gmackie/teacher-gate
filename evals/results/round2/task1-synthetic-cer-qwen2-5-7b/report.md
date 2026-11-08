# Task 1 evaluation: task1-synthetic-cer-qwen2-5-7b

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) (CC-BY-4.0) — **SYNTHETIC data**
- Labels: The synthetic data's author (not teacher-validated)
- Sample: all 40 items; n = 40 items
- Model: ollama/qwen2.5:7b; judge: anthropic/claude-haiku-5-5
- Estimated spend: $0.2182

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 100.0% (40/40) | 100.0% (40/40) |
| Findings schema-valid | 100.0% (120/120) | 100.0% (120/120) |
| Findings with inexact evidence, as returned by the model | 2.5% [1–7] (3/120) | 4.2% [2–9] (5/120) |
| Findings with fabricated evidence (not in work even normalised), as returned | 2.5% [1–7] (3/120) | 4.2% [2–9] (5/120) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–3] (0/117) | 4.2% [2–9] (5/120) |
| Findings surfaced per item | 2.92 | 3.00 |
| Suggested level = human label (exact) | 59.8% [51–68] (70/117) | 57.5% [49–66] (69/120) |
| Suggested level within one of human label | 96.6% [92–99] (113/117) | 99.2% [95–100] (119/120) |
| Quadratic weighted kappa | 0.613 | 0.624 |
| Criterion coverage (item×criterion with a suggestion) | 97.5% (117/120) | 100.0% (120/120) |
| **Items leaking grades/levels/rejected findings to the student** | 0.0% [0–9] (0/40) | 0.0% [0–9] (0/40) |
| Items with any student-facing feedback | 40 | 40 |
| Structured levels a product might display | 0 (never in the student view) | 120 |
| Injection items with an inflated top-level suggestion | 33.3% (2/6) | 50.0% (3/6) |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 52.5% [37–67] (21/40) | 80.0% [65–90] (32/40) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 92.5% [80–97] (37/40) | 67.5% [52–80] (27/40) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 100.0% [91–100] (40/40) | 100.0% [91–100] (40/40) |
| Tokens in / out | 45767 / 20047 | 20818 / 15783 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 113, edited 0, rejected 4; accepted unedited 96.6% (113/117).
Findings the harness dropped, by reason: quote-not-found 3. Accepted findings flagged as repeating a rejected one (then rejected): 0.

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| language | dialect | harness | 4 | 0.0% (0/12) | 0.0% (0/12) | 83.3% (10/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | dialect | baseline | 4 | 0.0% (0/12) | 0.0% (0/12) | 66.7% (8/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | multilingual | harness | 4 | 0.0% (0/12) | 0.0% (0/12) | 58.3% (7/12) | 91.7% (11/12) | 0.0% (0/4) |
| language | multilingual | baseline | 4 | 0.0% (0/12) | 0.0% (0/12) | 41.7% (5/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | standard | harness | 32 | 3.1% (3/96) | 0.0% (0/93) | 57.0% (53/93) | 96.8% (90/93) | 0.0% (0/32) |
| language | standard | baseline | 32 | 5.2% (5/96) | 5.2% (5/96) | 58.3% (56/96) | 99.0% (95/96) | 0.0% (0/32) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
