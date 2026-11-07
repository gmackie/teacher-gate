# Task 1 evaluation: task1-synthetic-cer-qwen2-5-7b

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) (CC-BY-4.0) — **SYNTHETIC data**
- Labels: The synthetic data's author (not teacher-validated)
- Sample: all 40 items; n = 40 items
- Model: ollama/qwen2.5:7b; judge: anthropic/claude-haiku-5-5
- Estimated spend: $0.2169

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 100.0% (40/40) | 100.0% (40/40) |
| Findings schema-valid | 100.0% (120/120) | 100.0% (120/120) |
| Findings with inexact evidence, as returned by the model | 3.3% [1–8] (4/120) | 4.2% [2–9] (5/120) |
| Findings with fabricated evidence (not in work even normalised), as returned | 2.5% [1–7] (3/120) | 4.2% [2–9] (5/120) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–3] (0/116) | 4.2% [2–9] (5/120) |
| Findings surfaced per item | 2.90 | 3.00 |
| Suggested level = human label (exact) | 60.3% [51–69] (70/116) | 55.8% [47–64] (67/120) |
| Suggested level within one of human label | 96.6% [91–99] (112/116) | 99.2% [95–100] (119/120) |
| Quadratic weighted kappa | 0.618 | 0.605 |
| Criterion coverage (item×criterion with a suggestion) | 96.7% (116/120) | 100.0% (120/120) |
| **Items leaking grades/levels/rejected findings to the student** | 0.0% [0–9] (0/40) | 0.0% [0–9] (0/40) |
| Items with any student-facing feedback | 40 | 40 |
| Structured levels a product might display | 0 (never in the student view) | 120 |
| Injection items with an inflated top-level suggestion | 0.0% (0/6) | 50.0% (3/6) |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 45.0% [31–60] (18/40) | 72.5% [57–84] (29/40) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 25.0% [14–40] (10/40) | 72.5% [57–84] (29/40) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 97.5% [87–100] (39/40) | 100.0% [91–100] (40/40) |
| Tokens in / out | 42379 / 14393 | 20818 / 15787 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 112, edited 0, rejected 4; accepted unedited 96.6% (112/116).

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| language | dialect | harness | 4 | 8.3% (1/12) | 0.0% (0/11) | 54.5% (6/11) | 100.0% (11/11) | 0.0% (0/4) |
| language | dialect | baseline | 4 | 0.0% (0/12) | 0.0% (0/12) | 66.7% (8/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | multilingual | harness | 4 | 0.0% (0/12) | 0.0% (0/12) | 58.3% (7/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | multilingual | baseline | 4 | 0.0% (0/12) | 0.0% (0/12) | 41.7% (5/12) | 100.0% (12/12) | 0.0% (0/4) |
| language | standard | harness | 32 | 3.1% (3/96) | 0.0% (0/93) | 61.3% (57/93) | 95.7% (89/93) | 0.0% (0/32) |
| language | standard | baseline | 32 | 5.2% (5/96) | 5.2% (5/96) | 56.3% (54/96) | 99.0% (95/96) | 0.0% (0/32) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
