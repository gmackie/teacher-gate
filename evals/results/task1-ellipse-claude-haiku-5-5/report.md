# Task 1 evaluation: task1-ellipse-claude-haiku-5-5

- Dataset: ELLIPSE corpus, train split (CC BY 4.0)
- Labels: Two trained raters per essay, averaged (ELLIPSE final corpus)
- Sample: stratified by race_ethnicity (Hispanic/Latino; Asian/Pacific Islander; Black/African American; White), up to 20 each, seed 20261107; n = 80 items
- Model: anthropic/claude-haiku-5-5; judge: anthropic/claude-haiku-5-5
- Estimated spend: $0.7523

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 100.0% (80/80) | 100.0% (80/80) |
| Findings schema-valid | 100.0% (501/501) | 99.8% (480/481) |
| Findings with inexact evidence, as returned by the model | 3.4% [2–5] (17/501) | 5.2% [4–8] (25/481) |
| Findings with fabricated evidence (not in work even normalised), as returned | 1.8% [1–3] (9/501) | 3.7% [2–6] (18/481) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–1] (0/484) | 5.2% [4–8] (25/481) |
| Findings surfaced per item | 6.05 | 6.01 |
| Suggested level = human label (exact) | 22.6% [19–27] (105/464) | 17.0% [13–22] (48/282) |
| Suggested level within one of human label | 76.3% [72–80] (354/464) | 70.9% [65–76] (200/282) |
| Quadratic weighted kappa | 0.182 | 0.163 |
| Criterion coverage (item×criterion with a suggestion) | 96.7% (464/480) | 58.8% (282/480) |
| **Items leaking grades/levels/rejected findings to the student** | 0.0% [0–5] (0/80) | 3.8% [1–10] (3/80) |
| Items with any student-facing feedback | 79 | 80 |
| Structured levels a product might display | 0 (never in the student view) | 282 |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 77.2% [67–85] (61/79) | 92.5% [85–97] (74/80) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 12.7% [7–22] (10/79) | 100.0% [95–100] (80/80) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 100.0% [95–100] (79/79) | 100.0% [95–100] (80/80) |
| Tokens in / out | 181188 / 229999 | 145911 / 236563 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 373, edited 0, rejected 111; accepted unedited 77.1% (373/484).

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| gender | Female | harness | 30 | 5.3% (10/189) | 0.0% (0/179) | 19.4% (33/170) | 75.9% (129/170) | 0.0% (0/30) |
| gender | Female | baseline | 30 | 6.1% (11/181) | 6.1% (11/181) | 18.9% (17/90) | 68.9% (62/90) | 3.3% (1/30) |
| gender | Male | harness | 50 | 2.2% (7/312) | 0.0% (0/305) | 24.5% (72/294) | 76.5% (225/294) | 0.0% (0/50) |
| gender | Male | baseline | 50 | 4.7% (14/300) | 4.7% (14/300) | 16.1% (31/192) | 71.9% (138/192) | 4.0% (2/50) |
| grade | 10 | harness | 2 | 0.0% (0/12) | 0.0% (0/12) | 0.0% (0/12) | 50.0% (6/12) | 0.0% (0/2) |
| grade | 10 | baseline | 2 | 0.0% (0/12) | 0.0% (0/12) | 0.0% (0/6) | 83.3% (5/6) | 0.0% (0/2) |
| grade | 11 | harness | 27 | 5.5% (9/165) | 0.0% (0/156) | 26.8% (41/153) | 70.6% (108/153) | 0.0% (0/27) |
| grade | 11 | baseline | 27 | 4.3% (7/162) | 4.3% (7/162) | 20.6% (21/102) | 65.7% (67/102) | 0.0% (0/27) |
| grade | 12 | harness | 21 | 1.5% (2/134) | 0.0% (0/132) | 21.6% (27/125) | 82.4% (103/125) | 0.0% (0/21) |
| grade | 12 | baseline | 21 | 4.0% (5/126) | 4.0% (5/126) | 18.5% (10/54) | 75.9% (41/54) | 4.8% (1/21) |
| grade | 8 | harness | 28 | 3.4% (6/178) | 0.0% (0/172) | 21.6% (35/162) | 79.6% (129/162) | 0.0% (0/28) |
| grade | 8 | baseline | 28 | 7.1% (12/169) | 7.1% (12/169) | 14.8% (16/108) | 73.1% (79/108) | 7.1% (2/28) |
| grade | 9 | harness | 2 | 0.0% (0/12) | 0.0% (0/12) | 16.7% (2/12) | 66.7% (8/12) | 0.0% (0/2) |
| grade | 9 | baseline | 2 | 8.3% (1/12) | 8.3% (1/12) | 8.3% (1/12) | 66.7% (8/12) | 0.0% (0/2) |
| race_ethnicity | Asian/Pacific Islander | harness | 20 | 3.1% (4/131) | 0.0% (0/127) | 16.2% (19/117) | 66.7% (78/117) | 0.0% (0/20) |
| race_ethnicity | Asian/Pacific Islander | baseline | 20 | 4.2% (5/120) | 4.2% (5/120) | 16.7% (10/60) | 70.0% (42/60) | 0.0% (0/20) |
| race_ethnicity | Black/African American | harness | 20 | 2.5% (3/122) | 0.0% (0/119) | 27.6% (32/116) | 78.4% (91/116) | 0.0% (0/20) |
| race_ethnicity | Black/African American | baseline | 20 | 4.2% (5/120) | 4.2% (5/120) | 16.7% (10/60) | 73.3% (44/60) | 5.0% (1/20) |
| race_ethnicity | Hispanic/Latino | harness | 20 | 4.1% (5/122) | 0.0% (0/117) | 26.1% (30/115) | 92.2% (106/115) | 0.0% (0/20) |
| race_ethnicity | Hispanic/Latino | baseline | 20 | 6.7% (8/120) | 6.7% (8/120) | 20.5% (16/78) | 82.1% (64/78) | 5.0% (1/20) |
| race_ethnicity | White | harness | 20 | 4.0% (5/126) | 0.0% (0/121) | 20.7% (24/116) | 68.1% (79/116) | 0.0% (0/20) |
| race_ethnicity | White | baseline | 20 | 5.8% (7/121) | 5.8% (7/121) | 14.3% (12/84) | 59.5% (50/84) | 5.0% (1/20) |
| ses | Economically disadvantaged | harness | 52 | 3.4% (11/320) | 0.0% (0/309) | 22.3% (67/301) | 80.1% (241/301) | 0.0% (0/52) |
| ses | Economically disadvantaged | baseline | 52 | 4.8% (15/312) | 4.8% (15/312) | 14.4% (25/174) | 70.1% (122/174) | 3.8% (2/52) |
| ses | Not economically disadvantaged | harness | 28 | 3.3% (6/181) | 0.0% (0/175) | 23.3% (38/163) | 69.3% (113/163) | 0.0% (0/28) |
| ses | Not economically disadvantaged | baseline | 28 | 5.9% (10/169) | 5.9% (10/169) | 21.3% (23/108) | 72.2% (78/108) | 3.6% (1/28) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
