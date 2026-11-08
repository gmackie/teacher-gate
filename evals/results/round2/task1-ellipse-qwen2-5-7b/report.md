# Task 1 evaluation: task1-ellipse-qwen2-5-7b

- Dataset: ELLIPSE corpus, train split (CC BY 4.0)
- Labels: Two trained raters per essay, averaged (ELLIPSE final corpus)
- Sample: stratified by race_ethnicity (Hispanic/Latino; Asian/Pacific Islander; Black/African American; White), up to 20 each, seed 20261107; n = 80 items
- Model: ollama/qwen2.5:7b; judge: anthropic/claude-haiku-5-5
- Estimated spend: $0.4903

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 100.0% (80/80) | 100.0% (80/80) |
| Findings schema-valid | 100.0% (471/471) | 49.9% (236/473) |
| Findings with inexact evidence, as returned by the model | 12.3% [10–16] (58/471) | 13.3% [11–17] (63/473) |
| Findings with fabricated evidence (not in work even normalised), as returned | 7.4% [5–10] (35/471) | 8.5% [6–11] (40/473) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–1] (0/409) | 13.3% [11–17] (63/473) |
| Findings surfaced per item | 5.11 | 5.91 |
| Suggested level = human label (exact) | 21.8% [18–26] (87/400) | 22.3% [17–28] (50/224) |
| Suggested level within one of human label | 71.8% [67–76] (287/400) | 68.8% [62–74] (154/224) |
| Quadratic weighted kappa | 0.174 | 0.073 |
| Criterion coverage (item×criterion with a suggestion) | 83.3% (400/480) | 46.7% (224/480) |
| **Items leaking grades/levels/rejected findings to the student** | 0.0% [0–5] (0/80) | 2.5% [1–9] (2/80) |
| Items with any student-facing feedback | 77 | 80 |
| Structured levels a product might display | 0 (never in the student view) | 465 |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 55.8% [45–66] (43/77) | 57.5% [47–68] (46/80) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 62.3% [51–72] (48/77) | 27.5% [19–38] (22/80) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 100.0% [95–100] (77/77) | 96.3% [90–99] (77/80) |
| Tokens in / out | 119187 / 79248 | 88224 / 70581 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 295, edited 1, rejected 113; accepted unedited 72.1% (295/409).
Findings the harness dropped, by reason: duplicate 3, quote-not-found 58, unknown-criterion 1. Accepted findings flagged as repeating a rejected one (then rejected): 0.

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| gender | Female | harness | 30 | 15.9% (29/182) | 0.0% (0/150) | 24.8% (35/141) | 77.3% (109/141) | 0.0% (0/30) |
| gender | Female | baseline | 30 | 11.8% (21/178) | 11.8% (21/178) | 25.4% (18/71) | 77.5% (55/71) | 3.3% (1/30) |
| gender | Male | harness | 50 | 10.0% (29/289) | 0.0% (0/259) | 20.1% (52/259) | 68.7% (178/259) | 0.0% (0/50) |
| gender | Male | baseline | 50 | 14.2% (42/295) | 14.2% (42/295) | 20.9% (32/153) | 64.7% (99/153) | 2.0% (1/50) |
| grade | 10 | harness | 2 | 27.3% (3/11) | 0.0% (0/8) | 37.5% (3/8) | 75.0% (6/8) | 0.0% (0/2) |
| grade | 10 | baseline | 2 | 16.7% (2/12) | 16.7% (2/12) | n/a (0) | n/a (0) | 0.0% (0/2) |
| grade | 11 | harness | 27 | 7.5% (12/161) | 0.0% (0/146) | 24.1% (33/137) | 68.6% (94/137) | 0.0% (0/27) |
| grade | 11 | baseline | 27 | 8.1% (13/160) | 8.1% (13/160) | 25.8% (23/89) | 70.8% (63/89) | 0.0% (0/27) |
| grade | 12 | harness | 21 | 13.9% (17/122) | 0.0% (0/105) | 25.7% (27/105) | 85.7% (90/105) | 0.0% (0/21) |
| grade | 12 | baseline | 21 | 13.7% (17/124) | 13.7% (17/124) | 19.5% (8/41) | 80.5% (33/41) | 9.5% (2/21) |
| grade | 8 | harness | 28 | 15.8% (26/165) | 0.0% (0/138) | 15.2% (21/138) | 61.6% (85/138) | 0.0% (0/28) |
| grade | 8 | baseline | 28 | 18.8% (31/165) | 18.8% (31/165) | 20.2% (19/94) | 61.7% (58/94) | 0.0% (0/28) |
| grade | 9 | harness | 2 | 0.0% (0/12) | 0.0% (0/12) | 25.0% (3/12) | 100.0% (12/12) | 0.0% (0/2) |
| grade | 9 | baseline | 2 | 0.0% (0/12) | 0.0% (0/12) | n/a (0) | n/a (0) | 0.0% (0/2) |
| race_ethnicity | Asian/Pacific Islander | harness | 20 | 12.4% (15/121) | 0.0% (0/103) | 26.6% (25/94) | 71.3% (67/94) | 0.0% (0/20) |
| race_ethnicity | Asian/Pacific Islander | baseline | 20 | 10.9% (13/119) | 10.9% (13/119) | 3.4% (1/29) | 58.6% (17/29) | 0.0% (0/20) |
| race_ethnicity | Black/African American | harness | 20 | 12.1% (14/116) | 0.0% (0/101) | 19.8% (20/101) | 80.2% (81/101) | 0.0% (0/20) |
| race_ethnicity | Black/African American | baseline | 20 | 14.4% (17/118) | 14.4% (17/118) | 26.9% (14/52) | 82.7% (43/52) | 0.0% (0/20) |
| race_ethnicity | Hispanic/Latino | harness | 20 | 12.9% (15/116) | 0.0% (0/101) | 19.8% (20/101) | 68.3% (69/101) | 0.0% (0/20) |
| race_ethnicity | Hispanic/Latino | baseline | 20 | 16.1% (19/118) | 16.1% (19/118) | 28.6% (24/84) | 67.9% (57/84) | 0.0% (0/20) |
| race_ethnicity | White | harness | 20 | 11.9% (14/118) | 0.0% (0/104) | 21.2% (22/104) | 67.3% (70/104) | 0.0% (0/20) |
| race_ethnicity | White | baseline | 20 | 11.9% (14/118) | 11.9% (14/118) | 18.6% (11/59) | 62.7% (37/59) | 10.0% (2/20) |
| ses | Economically disadvantaged | harness | 52 | 14.0% (42/301) | 0.0% (0/258) | 19.8% (51/258) | 70.5% (182/258) | 0.0% (0/52) |
| ses | Economically disadvantaged | baseline | 52 | 11.0% (34/309) | 11.0% (34/309) | 24.0% (37/154) | 63.6% (98/154) | 3.8% (2/52) |
| ses | Not economically disadvantaged | harness | 28 | 9.4% (16/170) | 0.0% (0/151) | 25.4% (36/142) | 73.9% (105/142) | 0.0% (0/28) |
| ses | Not economically disadvantaged | baseline | 28 | 17.7% (29/164) | 17.7% (29/164) | 18.6% (13/70) | 80.0% (56/70) | 0.0% (0/28) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
