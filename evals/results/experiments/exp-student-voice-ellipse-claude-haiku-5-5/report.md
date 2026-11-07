# Task 1 evaluation: exp-student-voice-ellipse-claude-haiku-5-5

- Dataset: ELLIPSE corpus, train split (experiment: teacher instruction for student-addressed, actionable wording) (CC BY 4.0)
- Labels: Two trained raters per essay, averaged (ELLIPSE final corpus)
- Sample: stratified by race_ethnicity (Hispanic/Latino; Asian/Pacific Islander; Black/African American; White), up to 10 each, seed 20261107; n = 40 items
- Model: anthropic/claude-haiku-5-5; judge: anthropic/claude-haiku-5-5
- Estimated spend: $0.3594

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 100.0% (40/40) | 100.0% (40/40) |
| Findings schema-valid | 100.0% (259/259) | 99.6% (240/241) |
| Findings with inexact evidence, as returned by the model | 1.9% [1–4] (5/259) | 5.4% [3–9] (13/241) |
| Findings with fabricated evidence (not in work even normalised), as returned | 1.5% [1–4] (4/259) | 2.1% [1–5] (5/241) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–1] (0/254) | 5.4% [3–9] (13/241) |
| Findings surfaced per item | 6.35 | 6.03 |
| Suggested level = human label (exact) | 27.3% [22–33] (62/227) | 14.7% [10–21] (23/156) |
| Suggested level within one of human label | 78.9% [73–84] (179/227) | 73.7% [66–80] (115/156) |
| Quadratic weighted kappa | 0.212 | 0.177 |
| Criterion coverage (item×criterion with a suggestion) | 94.6% (227/240) | 65.0% (156/240) |
| **Items leaking grades/levels/rejected findings to the student** | 0.0% [0–9] (0/40) | 0.0% [0–9] (0/40) |
| Items with any student-facing feedback | 39 | 40 |
| Structured levels a product might display | 0 (never in the student view) | 156 |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 97.4% [87–100] (38/39) | 80.0% [65–90] (32/40) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 100.0% [91–100] (39/39) | 100.0% [91–100] (40/40) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 100.0% [91–100] (39/39) | 100.0% [91–100] (40/40) |
| Tokens in / out | 90802 / 116954 | 70742 / 118113 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 204, edited 0, rejected 50; accepted unedited 80.3% (204/254).

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| gender | Female | harness | 13 | 2.3% (2/87) | 0.0% (0/85) | 29.2% (21/72) | 80.6% (58/72) | 0.0% (0/13) |
| gender | Female | baseline | 13 | 5.1% (4/78) | 5.1% (4/78) | 16.7% (8/48) | 75.0% (36/48) | 0.0% (0/13) |
| gender | Male | harness | 27 | 1.7% (3/172) | 0.0% (0/169) | 26.5% (41/155) | 78.1% (121/155) | 0.0% (0/27) |
| gender | Male | baseline | 27 | 5.5% (9/163) | 5.5% (9/163) | 13.9% (15/108) | 73.1% (79/108) | 0.0% (0/27) |
| grade | 10 | harness | 1 | 0.0% (0/6) | 0.0% (0/6) | 33.3% (2/6) | 83.3% (5/6) | 0.0% (0/1) |
| grade | 10 | baseline | 1 | 0.0% (0/6) | 0.0% (0/6) | 0.0% (0/6) | 83.3% (5/6) | 0.0% (0/1) |
| grade | 11 | harness | 11 | 2.9% (2/69) | 0.0% (0/67) | 35.6% (21/59) | 71.2% (42/59) | 0.0% (0/11) |
| grade | 11 | baseline | 11 | 1.5% (1/66) | 1.5% (1/66) | 18.5% (10/54) | 66.7% (36/54) | 0.0% (0/11) |
| grade | 12 | harness | 12 | 2.6% (2/77) | 0.0% (0/75) | 28.4% (19/67) | 80.6% (54/67) | 0.0% (0/12) |
| grade | 12 | baseline | 12 | 4.2% (3/72) | 4.2% (3/72) | 0.0% (0/24) | 66.7% (16/24) | 0.0% (0/12) |
| grade | 8 | harness | 15 | 1.0% (1/101) | 0.0% (0/100) | 22.5% (20/89) | 83.1% (74/89) | 0.0% (0/15) |
| grade | 8 | baseline | 15 | 9.9% (9/91) | 9.9% (9/91) | 18.1% (13/72) | 80.6% (58/72) | 0.0% (0/15) |
| grade | 9 | harness | 1 | 0.0% (0/6) | 0.0% (0/6) | 0.0% (0/6) | 66.7% (4/6) | 0.0% (0/1) |
| grade | 9 | baseline | 1 | 0.0% (0/6) | 0.0% (0/6) | n/a (0) | n/a (0) | 0.0% (0/1) |
| race_ethnicity | Asian/Pacific Islander | harness | 10 | 3.2% (2/63) | 0.0% (0/61) | 34.0% (18/53) | 83.0% (44/53) | 0.0% (0/10) |
| race_ethnicity | Asian/Pacific Islander | baseline | 10 | 3.3% (2/60) | 3.3% (2/60) | 13.9% (5/36) | 86.1% (31/36) | 0.0% (0/10) |
| race_ethnicity | Black/African American | harness | 10 | 1.5% (1/68) | 0.0% (0/67) | 25.4% (15/59) | 79.7% (47/59) | 0.0% (0/10) |
| race_ethnicity | Black/African American | baseline | 10 | 0.0% (0/60) | 0.0% (0/60) | 19.4% (7/36) | 72.2% (26/36) | 0.0% (0/10) |
| race_ethnicity | Hispanic/Latino | harness | 10 | 1.6% (1/64) | 0.0% (0/63) | 28.1% (16/57) | 87.7% (50/57) | 0.0% (0/10) |
| race_ethnicity | Hispanic/Latino | baseline | 10 | 11.5% (7/61) | 11.5% (7/61) | 14.3% (6/42) | 83.3% (35/42) | 0.0% (0/10) |
| race_ethnicity | White | harness | 10 | 1.6% (1/64) | 0.0% (0/63) | 22.4% (13/58) | 65.5% (38/58) | 0.0% (0/10) |
| race_ethnicity | White | baseline | 10 | 6.7% (4/60) | 6.7% (4/60) | 11.9% (5/42) | 54.8% (23/42) | 0.0% (0/10) |
| ses | Economically disadvantaged | harness | 25 | 1.2% (2/166) | 0.0% (0/164) | 28.5% (41/144) | 80.6% (116/144) | 0.0% (0/25) |
| ses | Economically disadvantaged | baseline | 25 | 5.3% (8/151) | 5.3% (8/151) | 13.5% (13/96) | 77.1% (74/96) | 0.0% (0/25) |
| ses | Not economically disadvantaged | harness | 15 | 3.2% (3/93) | 0.0% (0/90) | 25.3% (21/83) | 75.9% (63/83) | 0.0% (0/15) |
| ses | Not economically disadvantaged | baseline | 15 | 5.6% (5/90) | 5.6% (5/90) | 16.7% (10/60) | 68.3% (41/60) | 0.0% (0/15) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
