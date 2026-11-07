# Task 1 evaluation: task1-synthetic-cer-llama3-1-8b

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) (CC-BY-4.0) — **SYNTHETIC data**
- Labels: The synthetic data's author (not teacher-validated)
- Sample: all 40 items; n = 40 items
- Model: ollama/llama3.1:8b; judge: anthropic/claude-haiku-5-5
- Estimated spend: $0.2211

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 100.0% (40/40) | 100.0% (40/40) |
| Findings schema-valid | 100.0% (122/122) | 80.0% (96/120) |
| Findings with inexact evidence, as returned by the model | 3.3% [1–8] (4/122) | 3.3% [1–8] (4/120) |
| Findings with fabricated evidence (not in work even normalised), as returned | 0.0% [0–3] (0/122) | 2.5% [1–7] (3/120) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–3] (0/118) | 3.3% [1–8] (4/120) |
| Findings surfaced per item | 2.95 | 3.00 |
| Suggested level = human label (exact) | 61.4% [52–70] (70/114) | 40.4% [31–50] (40/99) |
| Suggested level within one of human label | 96.5% [91–99] (110/114) | 100.0% [96–100] (99/99) |
| Quadratic weighted kappa | 0.556 | 0.356 |
| Criterion coverage (item×criterion with a suggestion) | 95.0% (114/120) | 82.5% (99/120) |
| **Items leaking grades/levels/rejected findings to the student** | 0.0% [0–9] (0/40) | 0.0% [0–9] (0/40) |
| Items with any student-facing feedback | 40 | 40 |
| Structured levels a product might display | 0 (never in the student view) | 111 |
| Injection items with an inflated top-level suggestion | 33.3% (2/6) | 16.7% (1/6) |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 52.5% [37–67] (21/40) | 37.5% [24–53] (15/40) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 12.5% [5–26] (5/40) | 57.5% [42–71] (23/40) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 97.5% [87–100] (39/40) | 100.0% [91–100] (40/40) |
| Tokens in / out | 41555 / 12961 | 20784 / 13636 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 114, edited 0, rejected 4; accepted unedited 96.6% (114/118).

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| language | dialect | harness | 4 | 0.0% (0/11) | 0.0% (0/11) | 45.5% (5/11) | 100.0% (11/11) | 0.0% (0/4) |
| language | dialect | baseline | 4 | 0.0% (0/12) | 0.0% (0/12) | 25.0% (2/8) | 100.0% (8/8) | 0.0% (0/4) |
| language | multilingual | harness | 4 | 14.3% (2/14) | 0.0% (0/12) | 40.0% (4/10) | 100.0% (10/10) | 0.0% (0/4) |
| language | multilingual | baseline | 4 | 0.0% (0/12) | 0.0% (0/12) | 20.0% (2/10) | 100.0% (10/10) | 0.0% (0/4) |
| language | standard | harness | 32 | 2.1% (2/97) | 0.0% (0/95) | 65.6% (61/93) | 95.7% (89/93) | 0.0% (0/32) |
| language | standard | baseline | 32 | 4.2% (4/96) | 4.2% (4/96) | 44.4% (36/81) | 100.0% (81/81) | 0.0% (0/32) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
