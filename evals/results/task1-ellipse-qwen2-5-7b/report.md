# Task 1 evaluation: task1-ellipse-qwen2-5-7b

- Dataset: ELLIPSE corpus, train split (CC BY 4.0)
- Labels: Two trained raters per essay, averaged (ELLIPSE final corpus)
- Sample: stratified by race_ethnicity (Hispanic/Latino; Asian/Pacific Islander; Black/African American; White), up to 20 each, seed 20261107; n = 80 items
- Model: ollama/qwen2.5:7b; judge: anthropic/claude-haiku-5-5
- Estimated spend: $0.4389

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 100.0% (80/80) | 100.0% (80/80) |
| Findings schema-valid | 99.8% (479/480) | 48.8% (230/471) |
| Findings with inexact evidence, as returned by the model | 15.6% [13–19] (75/480) | 14.2% [11–18] (67/471) |
| Findings with fabricated evidence (not in work even normalised), as returned | 11.5% [9–15] (55/480) | 10.0% [8–13] (47/471) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–1] (0/405) | 14.2% [11–18] (67/471) |
| Findings surfaced per item | 5.06 | 5.89 |
| Suggested level = human label (exact) | 15.1% [12–19] (61/405) | 22.0% [17–28] (48/218) |
| Suggested level within one of human label | 56.8% [52–62] (230/405) | 69.3% [63–75] (151/218) |
| Quadratic weighted kappa | 0.046 | 0.067 |
| Criterion coverage (item×criterion with a suggestion) | 84.4% (405/480) | 45.4% (218/480) |
| **Items leaking grades/levels/rejected findings to the student** | 0.0% [0–5] (0/80) | 2.5% [1–9] (2/80) |
| Items with any student-facing feedback | 66 | 80 |
| Structured levels a product might display | 0 (never in the student view) | 463 |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 27.3% [18–39] (18/66) | 56.3% [45–67] (45/80) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 4.5% [2–13] (3/66) | 35.0% [25–46] (28/80) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 97.0% [90–99] (64/66) | 97.5% [91–99] (78/80) |
| Tokens in / out | 112381 / 70293 | 88224 / 70609 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 230, edited 0, rejected 175; accepted unedited 56.8% (230/405).

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| gender | Female | harness | 30 | 17.8% (32/180) | 0.0% (0/148) | 18.9% (28/148) | 64.9% (96/148) | 0.0% (0/30) |
| gender | Female | baseline | 30 | 12.9% (23/178) | 12.9% (23/178) | 22.5% (16/71) | 78.9% (56/71) | 3.3% (1/30) |
| gender | Male | harness | 50 | 14.3% (43/300) | 0.0% (0/257) | 12.8% (33/257) | 52.1% (134/257) | 0.0% (0/50) |
| gender | Male | baseline | 50 | 15.0% (44/293) | 15.0% (44/293) | 21.8% (32/147) | 64.6% (95/147) | 2.0% (1/50) |
| grade | 10 | harness | 2 | 0.0% (0/12) | 0.0% (0/12) | 0.0% (0/12) | 66.7% (8/12) | 0.0% (0/2) |
| grade | 10 | baseline | 2 | 16.7% (2/12) | 16.7% (2/12) | n/a (0) | n/a (0) | 0.0% (0/2) |
| grade | 11 | harness | 27 | 14.8% (24/162) | 0.0% (0/138) | 15.9% (22/138) | 50.7% (70/138) | 0.0% (0/27) |
| grade | 11 | baseline | 27 | 9.4% (15/160) | 9.4% (15/160) | 25.8% (23/89) | 70.8% (63/89) | 0.0% (0/27) |
| grade | 12 | harness | 21 | 7.1% (9/126) | 0.0% (0/117) | 11.1% (13/117) | 64.1% (75/117) | 0.0% (0/21) |
| grade | 12 | baseline | 21 | 14.8% (18/122) | 14.8% (18/122) | 17.1% (6/35) | 85.7% (30/35) | 9.5% (2/21) |
| grade | 8 | harness | 28 | 25.0% (42/168) | 0.0% (0/126) | 19.8% (25/126) | 55.6% (70/126) | 0.0% (0/28) |
| grade | 8 | baseline | 28 | 19.4% (32/165) | 19.4% (32/165) | 20.2% (19/94) | 61.7% (58/94) | 0.0% (0/28) |
| grade | 9 | harness | 2 | 0.0% (0/12) | 0.0% (0/12) | 8.3% (1/12) | 58.3% (7/12) | 0.0% (0/2) |
| grade | 9 | baseline | 2 | 0.0% (0/12) | 0.0% (0/12) | n/a (0) | n/a (0) | 0.0% (0/2) |
| race_ethnicity | Asian/Pacific Islander | harness | 20 | 21.7% (26/120) | 0.0% (0/94) | 13.8% (13/94) | 53.2% (50/94) | 0.0% (0/20) |
| race_ethnicity | Asian/Pacific Islander | baseline | 20 | 7.6% (9/118) | 7.6% (9/118) | 4.3% (1/23) | 56.5% (13/23) | 0.0% (0/20) |
| race_ethnicity | Black/African American | harness | 20 | 8.3% (10/120) | 0.0% (0/110) | 19.1% (21/110) | 60.0% (66/110) | 0.0% (0/20) |
| race_ethnicity | Black/African American | baseline | 20 | 18.6% (22/118) | 18.6% (22/118) | 26.9% (14/52) | 82.7% (43/52) | 0.0% (0/20) |
| race_ethnicity | Hispanic/Latino | harness | 20 | 18.3% (22/120) | 0.0% (0/98) | 18.4% (18/98) | 63.3% (62/98) | 0.0% (0/20) |
| race_ethnicity | Hispanic/Latino | baseline | 20 | 16.2% (19/117) | 16.2% (19/117) | 26.2% (22/84) | 69.0% (58/84) | 0.0% (0/20) |
| race_ethnicity | White | harness | 20 | 14.2% (17/120) | 0.0% (0/103) | 8.7% (9/103) | 50.5% (52/103) | 0.0% (0/20) |
| race_ethnicity | White | baseline | 20 | 14.4% (17/118) | 14.4% (17/118) | 18.6% (11/59) | 62.7% (37/59) | 10.0% (2/20) |
| ses | Economically disadvantaged | harness | 52 | 13.5% (42/312) | 0.0% (0/270) | 13.7% (37/270) | 55.6% (150/270) | 0.0% (0/52) |
| ses | Economically disadvantaged | baseline | 52 | 12.7% (39/308) | 12.7% (39/308) | 22.7% (35/154) | 64.3% (99/154) | 3.8% (2/52) |
| ses | Not economically disadvantaged | harness | 28 | 19.6% (33/168) | 0.0% (0/135) | 17.8% (24/135) | 59.3% (80/135) | 0.0% (0/28) |
| ses | Not economically disadvantaged | baseline | 28 | 17.2% (28/163) | 17.2% (28/163) | 20.3% (13/64) | 81.3% (52/64) | 0.0% (0/28) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
