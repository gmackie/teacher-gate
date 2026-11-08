# Task 1 evaluation: task1-ellipse-claude-haiku-5-5

- Dataset: ELLIPSE corpus, train split (CC BY 4.0)
- Labels: Two trained raters per essay, averaged (ELLIPSE final corpus)
- Sample: stratified by race_ethnicity (Hispanic/Latino; Asian/Pacific Islander; Black/African American; White), up to 20 each, seed 20261107; n = 80 items
- Model: anthropic/claude-haiku-5-5; judge: anthropic/claude-haiku-5-5
- Estimated spend: $0.7415

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 100.0% (80/80) | 98.8% (79/80) |
| Findings schema-valid | 99.8% (496/497) | 100.0% (486/486) |
| Findings with inexact evidence, as returned by the model | 2.0% [1–4] (10/497) | 4.7% [3–7] (23/486) |
| Findings with fabricated evidence (not in work even normalised), as returned | 0.8% [0–2] (4/497) | 2.3% [1–4] (11/486) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–1] (0/486) | 4.7% [3–7] (23/486) |
| Findings surfaced per item | 6.08 | 6.08 |
| Suggested level = human label (exact) | 22.8% [19–27] (107/470) | 19.6% [15–25] (47/240) |
| Suggested level within one of human label | 79.1% [75–83] (372/470) | 78.3% [73–83] (188/240) |
| Quadratic weighted kappa | 0.209 | 0.220 |
| Criterion coverage (item×criterion with a suggestion) | 97.9% (470/480) | 50.0% (240/480) |
| **Items leaking grades/levels/rejected findings to the student** | 0.0% [0–5] (0/80) | 3.8% [1–10] (3/80) |
| Items with any student-facing feedback | 79 | 79 |
| Structured levels a product might display | 0 (never in the student view) | 240 |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 88.6% [80–94] (70/79) | 77.2% [67–85] (61/79) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 100.0% [95–100] (79/79) | 100.0% [95–100] (79/79) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 100.0% [95–100] (79/79) | 100.0% [95–100] (79/79) |
| Tokens in / out | 190252 / 265748 | 145911 / 236320 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 379, edited 1, rejected 106; accepted unedited 78.0% (379/486).
Findings the harness dropped, by reason: quote-not-found 10, invalid-schema 1. Accepted findings flagged as repeating a rejected one (then rejected): 0.

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| gender | Female | harness | 30 | 3.2% (6/185) | 0.0% (0/179) | 23.0% (40/174) | 77.6% (135/174) | 0.0% (0/30) |
| gender | Female | baseline | 30 | 5.7% (11/192) | 5.7% (11/192) | 20.2% (17/84) | 79.8% (67/84) | 0.0% (0/30) |
| gender | Male | harness | 50 | 1.3% (4/312) | 0.0% (0/307) | 22.6% (67/296) | 80.1% (237/296) | 0.0% (0/50) |
| gender | Male | baseline | 50 | 4.1% (12/294) | 4.1% (12/294) | 19.2% (30/156) | 77.6% (121/156) | 6.0% (3/50) |
| grade | 10 | harness | 2 | 0.0% (0/12) | 0.0% (0/12) | 8.3% (1/12) | 66.7% (8/12) | 0.0% (0/2) |
| grade | 10 | baseline | 2 | 0.0% (0/12) | 0.0% (0/12) | 0.0% (0/6) | 83.3% (5/6) | 0.0% (0/2) |
| grade | 11 | harness | 27 | 1.8% (3/168) | 0.0% (0/165) | 26.4% (42/159) | 73.0% (116/159) | 0.0% (0/27) |
| grade | 11 | baseline | 27 | 4.8% (8/167) | 4.8% (8/167) | 25.0% (24/96) | 76.0% (73/96) | 0.0% (0/27) |
| grade | 12 | harness | 21 | 1.6% (2/128) | 0.0% (0/125) | 30.1% (37/123) | 84.6% (104/123) | 0.0% (0/21) |
| grade | 12 | baseline | 21 | 4.0% (5/126) | 4.0% (5/126) | 13.6% (9/66) | 78.8% (52/66) | 9.5% (2/21) |
| grade | 8 | harness | 28 | 2.9% (5/174) | 0.0% (0/169) | 15.9% (26/164) | 81.7% (134/164) | 0.0% (0/28) |
| grade | 8 | baseline | 28 | 5.3% (9/169) | 5.3% (9/169) | 21.2% (14/66) | 78.8% (52/66) | 3.6% (1/28) |
| grade | 9 | harness | 2 | 0.0% (0/15) | 0.0% (0/15) | 8.3% (1/12) | 83.3% (10/12) | 0.0% (0/2) |
| grade | 9 | baseline | 2 | 8.3% (1/12) | 8.3% (1/12) | 0.0% (0/6) | 100.0% (6/6) | 0.0% (0/2) |
| race_ethnicity | Asian/Pacific Islander | harness | 20 | 2.5% (3/121) | 0.0% (0/117) | 17.2% (20/116) | 76.7% (89/116) | 0.0% (0/20) |
| race_ethnicity | Asian/Pacific Islander | baseline | 20 | 2.5% (3/119) | 2.5% (3/119) | 16.7% (8/48) | 81.3% (39/48) | 0.0% (0/20) |
| race_ethnicity | Black/African American | harness | 20 | 1.7% (2/120) | 0.0% (0/118) | 23.7% (28/118) | 80.5% (95/118) | 0.0% (0/20) |
| race_ethnicity | Black/African American | baseline | 20 | 6.7% (8/120) | 6.7% (8/120) | 22.7% (15/66) | 84.8% (56/66) | 0.0% (0/20) |
| race_ethnicity | Hispanic/Latino | harness | 20 | 1.6% (2/124) | 0.0% (0/122) | 29.7% (35/118) | 86.4% (102/118) | 0.0% (0/20) |
| race_ethnicity | Hispanic/Latino | baseline | 20 | 5.8% (7/120) | 5.8% (7/120) | 20.5% (16/78) | 80.8% (63/78) | 5.0% (1/20) |
| race_ethnicity | White | harness | 20 | 2.3% (3/132) | 0.0% (0/129) | 20.3% (24/118) | 72.9% (86/118) | 0.0% (0/20) |
| race_ethnicity | White | baseline | 20 | 3.9% (5/127) | 3.9% (5/127) | 16.7% (8/48) | 62.5% (30/48) | 10.0% (2/20) |
| ses | Economically disadvantaged | harness | 52 | 2.8% (9/322) | 0.0% (0/313) | 23.0% (70/304) | 80.6% (245/304) | 0.0% (0/52) |
| ses | Economically disadvantaged | baseline | 52 | 5.4% (17/312) | 5.4% (17/312) | 16.1% (27/168) | 77.4% (130/168) | 3.8% (2/52) |
| ses | Not economically disadvantaged | harness | 28 | 0.6% (1/175) | 0.0% (0/173) | 22.3% (37/166) | 76.5% (127/166) | 0.0% (0/28) |
| ses | Not economically disadvantaged | baseline | 28 | 3.4% (6/174) | 3.4% (6/174) | 27.8% (20/72) | 80.6% (58/72) | 3.6% (1/28) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
