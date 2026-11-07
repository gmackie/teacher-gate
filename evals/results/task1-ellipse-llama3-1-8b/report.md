# Task 1 evaluation: task1-ellipse-llama3-1-8b

- Dataset: ELLIPSE corpus, train split (CC BY 4.0)
- Labels: Two trained raters per essay, averaged (ELLIPSE final corpus)
- Sample: stratified by race_ethnicity (Hispanic/Latino; Asian/Pacific Islander; Black/African American; White), up to 20 each, seed 20261107; n = 80 items
- Model: ollama/llama3.1:8b; judge: anthropic/claude-haiku-5-5
- Estimated spend: $0.3815

Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.

| Measure | Harness | Direct prompting |
|---|---|---|
| Call failures | 0 | 0 |
| Output parsed (JSON with findings) | 100.0% (80/80) | 95.0% (76/80) |
| Findings schema-valid | 96.0% (461/480) | 55.4% (242/437) |
| Findings with inexact evidence, as returned by the model | 20.8% [17–25] (100/480) | 28.4% [24–33] (124/437) |
| Findings with fabricated evidence (not in work even normalised), as returned | 14.2% [11–18] (68/480) | 20.4% [17–24] (89/437) |
| **Inexact evidence reaching a person** (teacher / student) | 0.0% [0–1] (0/362) | 28.4% [24–33] (124/437) |
| Findings surfaced per item | 4.53 | 5.46 |
| Suggested level = human label (exact) | 8.4% [6–12] (29/345) | 28.5% [23–35] (69/242) |
| Suggested level within one of human label | 44.9% [40–50] (155/345) | 83.5% [78–88] (202/242) |
| Quadratic weighted kappa | 0.129 | 0.118 |
| Criterion coverage (item×criterion with a suggestion) | 71.9% (345/480) | 50.4% (242/480) |
| **Items leaking grades/levels/rejected findings to the student** | 3.8% [1–10] (3/80) | 0.0% [0–5] (0/80) |
| Items with any student-facing feedback | 61 | 76 |
| Structured levels a product might display | 0 (never in the student view) | 425 |
| Learning Commons `student-response-specificity` pass rate (student-facing feedback) | 9.8% [5–20] (6/61) | 15.8% [9–26] (12/76) |
| Learning Commons `revision-actionability` pass rate (student-facing feedback) | 0.0% [0–6] (0/61) | 6.6% [3–14] (5/76) |
| Learning Commons `tone-appropriateness` pass rate (student-facing feedback) | 90.2% [80–95] (55/61) | 96.1% [89–99] (73/76) |
| Tokens in / out | 110963 / 56472 | 84026 / 54464 |

Simulated teacher (driven by the human labels, not a real teacher): accepted 172, edited 0, rejected 190; accepted unedited 47.5% (172/362).

Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.

## Breakdown by learner group

| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |
|---|---|---|---|---|---|---|---|---|
| gender | Female | harness | 30 | 15.0% (27/180) | 0.0% (0/142) | 12.2% (16/131) | 48.1% (63/131) | 6.7% (2/30) |
| gender | Female | baseline | 30 | 27.7% (44/159) | 27.7% (44/159) | 30.1% (28/93) | 82.8% (77/93) | 0.0% (0/30) |
| gender | Male | harness | 50 | 24.3% (73/300) | 0.0% (0/220) | 6.1% (13/214) | 43.0% (92/214) | 2.0% (1/50) |
| gender | Male | baseline | 50 | 28.8% (80/278) | 28.8% (80/278) | 27.5% (41/149) | 83.9% (125/149) | 0.0% (0/50) |
| grade | 10 | harness | 2 | 0.0% (0/12) | 0.0% (0/12) | 0.0% (0/12) | 25.0% (3/12) | 0.0% (0/2) |
| grade | 10 | baseline | 2 | 33.3% (4/12) | 33.3% (4/12) | 16.7% (2/12) | 66.7% (8/12) | 0.0% (0/2) |
| grade | 11 | harness | 27 | 16.0% (26/162) | 0.0% (0/136) | 10.9% (14/129) | 51.2% (66/129) | 3.7% (1/27) |
| grade | 11 | baseline | 27 | 25.3% (37/146) | 25.3% (37/146) | 26.2% (16/61) | 73.8% (45/61) | 0.0% (0/27) |
| grade | 12 | harness | 21 | 21.4% (27/126) | 0.0% (0/90) | 8.9% (8/90) | 50.0% (45/90) | 9.5% (2/21) |
| grade | 12 | baseline | 21 | 29.9% (35/117) | 29.9% (35/117) | 31.0% (26/84) | 89.3% (75/84) | 0.0% (0/21) |
| grade | 8 | harness | 28 | 23.2% (39/168) | 0.0% (0/120) | 6.4% (7/110) | 36.4% (40/110) | 0.0% (0/28) |
| grade | 8 | baseline | 28 | 28.7% (43/150) | 28.7% (43/150) | 25.6% (20/78) | 85.9% (67/78) | 0.0% (0/28) |
| grade | 9 | harness | 2 | 66.7% (8/12) | 0.0% (0/4) | 0.0% (0/4) | 25.0% (1/4) | 0.0% (0/2) |
| grade | 9 | baseline | 2 | 41.7% (5/12) | 41.7% (5/12) | 71.4% (5/7) | 100.0% (7/7) | 0.0% (0/2) |
| race_ethnicity | Asian/Pacific Islander | harness | 20 | 17.5% (21/120) | 0.0% (0/99) | 10.1% (10/99) | 50.5% (50/99) | 0.0% (0/20) |
| race_ethnicity | Asian/Pacific Islander | baseline | 20 | 30.0% (33/110) | 30.0% (33/110) | 25.7% (18/70) | 80.0% (56/70) | 0.0% (0/20) |
| race_ethnicity | Black/African American | harness | 20 | 21.7% (26/120) | 0.0% (0/83) | 5.2% (4/77) | 37.7% (29/77) | 10.0% (2/20) |
| race_ethnicity | Black/African American | baseline | 20 | 27.2% (28/103) | 27.2% (28/103) | 27.8% (15/54) | 77.8% (42/54) | 0.0% (0/20) |
| race_ethnicity | Hispanic/Latino | harness | 20 | 18.3% (22/120) | 0.0% (0/97) | 9.2% (8/87) | 46.0% (40/87) | 5.0% (1/20) |
| race_ethnicity | Hispanic/Latino | baseline | 20 | 35.7% (41/115) | 35.7% (41/115) | 31.5% (23/73) | 89.0% (65/73) | 0.0% (0/20) |
| race_ethnicity | White | harness | 20 | 25.8% (31/120) | 0.0% (0/83) | 8.5% (7/82) | 43.9% (36/82) | 0.0% (0/20) |
| race_ethnicity | White | baseline | 20 | 20.2% (22/109) | 20.2% (22/109) | 28.9% (13/45) | 86.7% (39/45) | 0.0% (0/20) |
| ses | Economically disadvantaged | harness | 52 | 22.4% (70/312) | 0.0% (0/231) | 8.2% (18/220) | 42.3% (93/220) | 5.8% (3/52) |
| ses | Economically disadvantaged | baseline | 52 | 28.6% (80/280) | 28.6% (80/280) | 29.6% (45/152) | 84.2% (128/152) | 0.0% (0/52) |
| ses | Not economically disadvantaged | harness | 28 | 17.9% (30/168) | 0.0% (0/131) | 8.8% (11/125) | 49.6% (62/125) | 0.0% (0/28) |
| ses | Not economically disadvantaged | baseline | 28 | 28.0% (44/157) | 28.0% (44/157) | 26.7% (24/90) | 82.2% (74/90) | 0.0% (0/28) |

Small groups have wide intervals; differences here are descriptive, not significance-tested.
