# Task 1 evaluation: task1-ellipse-claude-sonnet-5-5

- Dataset: ELLIPSE corpus, train split (CC BY 4.0)
- Labels: Two trained raters per essay, averaged (ELLIPSE final corpus)
- Sample: stratified by race_ethnicity (Hispanic/Latino; Asian/Pacific Islander; Black/African American; White), up to 20 each, seed 20261107; n = 80 items
- Model: anthropic/claude-sonnet-5-5; judge: anthropic/claude-haiku-5-5
- Estimated spend: $3.8228

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 100.0% (80/80) | 100.0% (80/80) |
| Findings schema-valid | 100.0% (480/480) | 99.4% (477/480) |
| Findings with inexact evidence, as returned by the model | 1.5% [1–3] (7/480) | 2.7% [2–5] (13/480) |
| Findings with fabricated evidence (not in work even normalised), as returned | 1.3% [1–3] (6/480) | 2.1% [1–4] (10/480) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–1] (0/473) | 2.7% [2–5] (13/480) |
| Findings surfaced per item | 5.91 | 6.00 |
| Suggested level = human label (exact) | 18.4% [15–22] (87/473) | 21.5% [18–25] (101/470) |
| Suggested level within one of human label | 77.2% [73–81] (365/473) | 84.5% [81–87] (397/470) |
| Quadratic weighted kappa | 0.225 | 0.269 |
| Criterion coverage (item×criterion with a suggestion) | 98.5% (473/480) | 97.9% (470/480) |
| **Items leaking grades/levels/rejected findings to the student** | 0.0% [0–5] (0/80) | 6.3% [3–14] (5/80) |
| Items with any student-facing feedback | 79 | 80 |
| Structured levels a product might display | 0 (never in the student view) | 480 |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 88.6% [80–94] (70/79) | 88.8% [80–94] (71/80) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 100.0% [95–100] (79/79) | 100.0% [95–100] (80/80) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 100.0% [95–100] (79/79) | 100.0% [95–100] (80/80) |
| Tokens in / out | 190254 / 131564 | 145911 / 138169 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 365, edited 0, rejected 108; accepted unedited 77.2% (365/473).
Findings the harness dropped, by reason: quote-not-found 7. Accepted findings flagged as repeating a rejected one (then rejected): 0.

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| gender | Female | harness | 30 | 2.2% (4/180) | 0.0% (0/176) | 21.6% (38/176) | 77.8% (137/176) | 0.0% (0/30) |
| gender | Female | baseline | 30 | 3.9% (7/180) | 3.9% (7/180) | 24.9% (44/177) | 89.3% (158/177) | 6.7% (2/30) |
| gender | Male | harness | 50 | 1.0% (3/300) | 0.0% (0/297) | 16.5% (49/297) | 76.8% (228/297) | 0.0% (0/50) |
| gender | Male | baseline | 50 | 2.0% (6/300) | 2.0% (6/300) | 19.5% (57/293) | 81.6% (239/293) | 6.0% (3/50) |
| grade | 10 | harness | 2 | 0.0% (0/12) | 0.0% (0/12) | 0.0% (0/12) | 75.0% (9/12) | 0.0% (0/2) |
| grade | 10 | baseline | 2 | 0.0% (0/12) | 0.0% (0/12) | 0.0% (0/12) | 75.0% (9/12) | 0.0% (0/2) |
| grade | 11 | harness | 27 | 0.0% (0/162) | 0.0% (0/162) | 25.3% (41/162) | 69.8% (113/162) | 0.0% (0/27) |
| grade | 11 | baseline | 27 | 1.2% (2/162) | 1.2% (2/162) | 26.1% (41/157) | 79.0% (124/157) | 0.0% (0/27) |
| grade | 12 | harness | 21 | 1.6% (2/126) | 0.0% (0/124) | 17.7% (22/124) | 84.7% (105/124) | 0.0% (0/21) |
| grade | 12 | baseline | 21 | 3.2% (4/126) | 3.2% (4/126) | 20.2% (25/124) | 87.1% (108/124) | 14.3% (3/21) |
| grade | 8 | harness | 28 | 3.0% (5/168) | 0.0% (0/163) | 14.1% (23/163) | 79.1% (129/163) | 0.0% (0/28) |
| grade | 8 | baseline | 28 | 3.6% (6/168) | 3.6% (6/168) | 21.2% (35/165) | 89.1% (147/165) | 7.1% (2/28) |
| grade | 9 | harness | 2 | 0.0% (0/12) | 0.0% (0/12) | 8.3% (1/12) | 75.0% (9/12) | 0.0% (0/2) |
| grade | 9 | baseline | 2 | 8.3% (1/12) | 8.3% (1/12) | 0.0% (0/12) | 75.0% (9/12) | 0.0% (0/2) |
| race_ethnicity | Asian/Pacific Islander | harness | 20 | 0.8% (1/120) | 0.0% (0/119) | 15.1% (18/119) | 65.5% (78/119) | 0.0% (0/20) |
| race_ethnicity | Asian/Pacific Islander | baseline | 20 | 3.3% (4/120) | 3.3% (4/120) | 18.4% (21/114) | 77.2% (88/114) | 0.0% (0/20) |
| race_ethnicity | Black/African American | harness | 20 | 0.8% (1/120) | 0.0% (0/119) | 19.3% (23/119) | 78.2% (93/119) | 0.0% (0/20) |
| race_ethnicity | Black/African American | baseline | 20 | 0.0% (0/120) | 0.0% (0/120) | 18.6% (22/118) | 87.3% (103/118) | 5.0% (1/20) |
| race_ethnicity | Hispanic/Latino | harness | 20 | 2.5% (3/120) | 0.0% (0/117) | 22.2% (26/117) | 85.5% (100/117) | 0.0% (0/20) |
| race_ethnicity | Hispanic/Latino | baseline | 20 | 3.3% (4/120) | 3.3% (4/120) | 29.2% (35/120) | 92.5% (111/120) | 10.0% (2/20) |
| race_ethnicity | White | harness | 20 | 1.7% (2/120) | 0.0% (0/118) | 16.9% (20/118) | 79.7% (94/118) | 0.0% (0/20) |
| race_ethnicity | White | baseline | 20 | 4.2% (5/120) | 4.2% (5/120) | 19.5% (23/118) | 80.5% (95/118) | 10.0% (2/20) |
| ses | Economically disadvantaged | harness | 52 | 1.6% (5/312) | 0.0% (0/307) | 19.5% (60/307) | 77.9% (239/307) | 0.0% (0/52) |
| ses | Economically disadvantaged | baseline | 52 | 2.6% (8/312) | 2.6% (8/312) | 22.1% (68/308) | 85.4% (263/308) | 7.7% (4/52) |
| ses | Not economically disadvantaged | harness | 28 | 1.2% (2/168) | 0.0% (0/166) | 16.3% (27/166) | 75.9% (126/166) | 0.0% (0/28) |
| ses | Not economically disadvantaged | baseline | 28 | 3.0% (5/168) | 3.0% (5/168) | 20.4% (33/162) | 82.7% (134/162) | 3.6% (1/28) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
