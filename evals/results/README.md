# Evaluation results

Every result reported in [`RESULTS.md`](RESULTS.md) and the [white paper](../../docs/white-paper.md)
has a run folder here:

| File | What it holds |
|---|---|
| `config.json` | Task 1 only: dataset, labels, sampling and seed, item ids, model, judge, evaluators, settings, git commit |
| `records.jsonl` | Tasks 1 and 2: one line per item and arm, with the raw model output, parsed findings, quote checks, simulated decisions, student-facing text, leaks and judge scores |
| `summary.json` | The aggregate measures with 95% Wilson intervals, the fairness breakdown (Task 1) and estimated spend |
| `report.md` | The same summary as a readable table |

`spend-ledger.json` is the shared hosted-spend ledger ($40 cap) for every run here, plus the
separate experiment and two diagnostic reproductions listed in it. `build-table.mjs` regenerates
`RESULTS.md` from the run folders; [`../scripts/run-all.sh`](../scripts/run-all.sh) re-runs
everything.

## Runs

| Task | Data | Models | Commit |
|---|---|---|---|
| 1 Verifiable rubric feedback | **REAL**: ELLIPSE train split, 80 essays stratified by race/ethnicity (20 per group, seed 20261107) | Claude Haiku 5.5, Claude Sonnet 5.5, Qwen 2.5 7B, Llama 3.1 8B | `975da0c` |
| 1 Verifiable rubric feedback | **SYNTHETIC**: 40 claim-evidence-reasoning paragraphs written as a placeholder for Playlab CER data | same four | `975da0c` |
| 2 Class misconception brief | **SYNTHETIC**: 3 class sets, 42 responses, 15 catalog entries, placeholder for Learning Equality maps | same four | `975da0c` |
| 3 Teacher guidance (learning loop) | **SYNTHETIC** CER set, rule-based simulated teacher | same four | `d3a8406` |
| 4 Teacher goals and monitoring | **SYNTHETIC** CER set, author labels standing in for the teacher | same four | `d3a8406` |

Judge for Task 1: three Learning Commons feedback evaluators (`student-response-specificity`,
`revision-actionability`, `tone-appropriateness`, prompts pinned at commit `e1b5dfb`) run on
Claude Haiku 5.5. Learning Commons validated them with a different model (OpenAI gpt-5.4 at
temperature 1) on different data (Quill "because" completions); these scores are not validated
against teacher labels.

## Known gaps in these records

- Tasks 2, 3 and 4 write no `config.json`, so their commit is recorded here and in
  `run-all.sh`, not inside the run folder. Tasks 3 and 4 write no `records.jsonl`; only their
  aggregates are kept.
- `task1-ellipse-qwen2-5-7b` was started once, aborted at about 45 of 160 calls to restart Ollama
  with parallel slots, and re-run from scratch. The aborted attempt's judge spend was not
  metered; the ledger books a conservative $0.13 for it, and the table's run spend includes it.
- Spend is the estimate from token counts and list prices in `packages/models/src/pricing.ts`,
  not an invoice.
- The `llama3.1:8b` ELLIPSE harness arm shows 3 of 80 items "leaking a rejected finding". In all
  three the model wrote word-for-word the same observation for two criteria (for example
  `syntax` and `grammar`); the simulated teacher rejected one copy and accepted the other, so the
  rejected words reached the student through the accepted finding. The leak check counts this,
  and so does the table. The harness does not de-duplicate identical findings.

## License and attribution

The run records, summaries and reports are CC-BY-4.0, like the rest of the repository's data and
documentation.

`records.jsonl` for the `task1-ellipse-*` runs quotes text from essays in the ELLIPSE corpus, and
each line carries the essay's corpus id and its gender, grade, race/ethnicity and economic-status
labels as published in the corpus. ELLIPSE is licensed CC BY 4.0, which permits this
redistribution with attribution, and its essays were de-identified by the publishers (names and
places are replaced with tokens such as `Generic_City`). Source: Crossley, S. A., Tian, Y.,
Baffour, P., Franklin, A., Kim, Y., Morris, W., Benner, B., Picou, A., & Boser, U. (2023).
Measuring second language proficiency using the ELLIPSE Corpus. *International Journal of Learner
Corpus Research*, 9(2), 248–269. Data: <https://github.com/scrosseye/ELLIPSE-Corpus>. Changes:
excerpts only, as quoted by models, inside evaluation records.

The synthetic datasets were written for Teacher Gate (CC-BY-4.0) and contain no student data.
