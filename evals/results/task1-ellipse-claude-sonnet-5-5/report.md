# Task 1 evaluation: task1-ellipse-claude-sonnet-5-5

- Dataset: ELLIPSE corpus, train split (CC BY 4.0)
- Labels: Two trained raters per essay, averaged (ELLIPSE final corpus)
- Sample: stratified by race_ethnicity (Hispanic/Latino; Asian/Pacific Islander; Black/African American; White), up to 20 each, seed 20261107; n = 80 items
- Model: anthropic/claude-sonnet-5-5; judge: anthropic/claude-haiku-5-5
- Estimated spend: $3.4990

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 100.0% (80/80) | 100.0% (80/80) |
| Findings schema-valid | 99.6% (479/481) | 99.2% (476/480) |
| Findings with inexact evidence, as returned by the model | 1.2% [1–3] (6/481) | 2.3% [1–4] (11/480) |
| Findings with fabricated evidence (not in work even normalised), as returned | 0.8% [0–2] (4/481) | 1.7% [1–3] (8/480) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–1] (0/473) | 2.3% [1–4] (11/480) |
| Findings surfaced per item | 5.91 | 6.00 |
| Suggested level = human label (exact) | 15.3% [12–19] (72/472) | 22.2% [19–26] (103/465) |
| Suggested level within one of human label | 74.2% [70–78] (350/472) | 82.4% [79–86] (383/465) |
| Quadratic weighted kappa | 0.209 | 0.255 |
| Criterion coverage (item×criterion with a suggestion) | 98.3% (472/480) | 96.9% (465/480) |
| **Items leaking grades/levels/rejected findings to the student** | 0.0% [0–5] (0/80) | 2.5% [1–9] (2/80) |
| Items with any student-facing feedback | 79 | 80 |
| Structured levels a product might display | 0 (never in the student view) | 480 |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 65.8% [55–75] (52/79) | 83.8% [74–90] (67/80) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 2.5% [1–9] (2/79) | 100.0% [95–100] (80/80) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 100.0% [95–100] (79/79) | 100.0% [95–100] (80/80) |
| Tokens in / out | 181234 / 99987 | 145911 / 138246 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 350, edited 1, rejected 122; accepted unedited 74.0% (350/473).

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| gender | Female | harness | 30 | 1.7% (3/181) | 0.0% (0/178) | 19.8% (35/177) | 72.9% (129/177) | 0.0% (0/30) |
| gender | Female | baseline | 30 | 1.7% (3/180) | 1.7% (3/180) | 23.7% (42/177) | 85.3% (151/177) | 3.3% (1/30) |
| gender | Male | harness | 50 | 1.0% (3/300) | 0.0% (0/295) | 12.5% (37/295) | 74.9% (221/295) | 0.0% (0/50) |
| gender | Male | baseline | 50 | 2.7% (8/300) | 2.7% (8/300) | 21.2% (61/288) | 80.6% (232/288) | 2.0% (1/50) |
| grade | 10 | harness | 2 | 0.0% (0/12) | 0.0% (0/12) | 0.0% (0/12) | 50.0% (6/12) | 0.0% (0/2) |
| grade | 10 | baseline | 2 | 16.7% (2/12) | 16.7% (2/12) | 0.0% (0/11) | 72.7% (8/11) | 0.0% (0/2) |
| grade | 11 | harness | 27 | 0.0% (0/162) | 0.0% (0/162) | 19.1% (31/162) | 67.3% (109/162) | 0.0% (0/27) |
| grade | 11 | baseline | 27 | 2.5% (4/162) | 2.5% (4/162) | 28.0% (44/157) | 74.5% (117/157) | 0.0% (0/27) |
| grade | 12 | harness | 21 | 1.6% (2/127) | 0.0% (0/124) | 13.8% (17/123) | 81.3% (100/123) | 0.0% (0/21) |
| grade | 12 | baseline | 21 | 0.8% (1/126) | 0.8% (1/126) | 20.5% (25/122) | 88.5% (108/122) | 4.8% (1/21) |
| grade | 8 | harness | 28 | 2.4% (4/168) | 0.0% (0/163) | 14.7% (24/163) | 77.9% (127/163) | 0.0% (0/28) |
| grade | 8 | baseline | 28 | 2.4% (4/168) | 2.4% (4/168) | 20.9% (34/163) | 87.1% (142/163) | 3.6% (1/28) |
| grade | 9 | harness | 2 | 0.0% (0/12) | 0.0% (0/12) | 0.0% (0/12) | 66.7% (8/12) | 0.0% (0/2) |
| grade | 9 | baseline | 2 | 0.0% (0/12) | 0.0% (0/12) | 0.0% (0/12) | 66.7% (8/12) | 0.0% (0/2) |
| race_ethnicity | Asian/Pacific Islander | harness | 20 | 1.7% (2/121) | 0.0% (0/119) | 15.3% (18/118) | 66.1% (78/118) | 0.0% (0/20) |
| race_ethnicity | Asian/Pacific Islander | baseline | 20 | 1.7% (2/120) | 1.7% (2/120) | 20.0% (23/115) | 74.8% (86/115) | 0.0% (0/20) |
| race_ethnicity | Black/African American | harness | 20 | 1.7% (2/120) | 0.0% (0/117) | 14.5% (17/117) | 73.5% (86/117) | 0.0% (0/20) |
| race_ethnicity | Black/African American | baseline | 20 | 3.3% (4/120) | 3.3% (4/120) | 19.0% (22/116) | 87.1% (101/116) | 0.0% (0/20) |
| race_ethnicity | Hispanic/Latino | harness | 20 | 0.8% (1/120) | 0.0% (0/119) | 16.0% (19/119) | 85.7% (102/119) | 0.0% (0/20) |
| race_ethnicity | Hispanic/Latino | baseline | 20 | 1.7% (2/120) | 1.7% (2/120) | 30.8% (36/117) | 90.6% (106/117) | 10.0% (2/20) |
| race_ethnicity | White | harness | 20 | 0.8% (1/120) | 0.0% (0/118) | 15.3% (18/118) | 71.2% (84/118) | 0.0% (0/20) |
| race_ethnicity | White | baseline | 20 | 2.5% (3/120) | 2.5% (3/120) | 18.8% (22/117) | 76.9% (90/117) | 0.0% (0/20) |
| ses | Economically disadvantaged | harness | 52 | 1.0% (3/313) | 0.0% (0/309) | 14.9% (46/308) | 76.0% (234/308) | 0.0% (0/52) |
| ses | Economically disadvantaged | baseline | 52 | 2.2% (7/312) | 2.2% (7/312) | 21.9% (66/301) | 83.1% (250/301) | 3.8% (2/52) |
| ses | Not economically disadvantaged | harness | 28 | 1.8% (3/168) | 0.0% (0/164) | 15.9% (26/164) | 70.7% (116/164) | 0.0% (0/28) |
| ses | Not economically disadvantaged | baseline | 28 | 2.4% (4/168) | 2.4% (4/168) | 22.6% (37/164) | 81.1% (133/164) | 0.0% (0/28) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
