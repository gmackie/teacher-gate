# Run the evaluation suite on your own data

The evaluation suite (`packages/evals`) compares Teacher Gate with direct prompting: the same
model, the same rubric and the same student work, once through the harness and once with a single
careful prompt and no checks. You can run Task 1 on your own scored writing to see how a model
behaves on your rubric and your students' work before you put it in front of teachers.

This page explains the dataset format, the commands and what each measure means. It does not
report results. Results from this repository's runs will be reported in a technical white paper
(`docs/white-paper.md`, forthcoming in this repository) and their raw outputs committed under
`evals/results/`.

## Before you start

- **Use data you are allowed to use.** Student writing is an education record. Use de-identified
  data under an agreement that permits this use, or synthetic data. Run with a local model
  (`ollama:…` or `vllm:…`) unless your agreement allows sending the work to a hosted provider.
- **Labels must be levels of your rubric.** The suite compares the model's suggested level with
  your human label for each criterion.

## The dataset format

Pass a JSON file in the `ScoredWritingDataset` shape (`packages/public-goods/src/types.ts`):

```json
{
  "id": "district-cer-2027",
  "title": "Grade 8 CER paragraphs, spring 2027 (de-identified)",
  "license": "Internal use only",
  "synthetic": false,
  "labelSource": "Two science teachers, consensus",
  "activity": {
    "id": "cer-ice",
    "title": "Which plate melts ice faster?",
    "prompt": "Write a claim-evidence-reasoning paragraph…",
    "aiHelp": "releasable",
    "rubric": { "id": "cer", "title": "CER", "criteria": [
      { "id": "claim", "title": "Claim", "levels": [
        { "id": "beginning", "label": "Beginning" }, { "id": "developing", "label": "Developing" }, { "id": "proficient", "label": "Proficient" } ] }
    ] }
  },
  "groupDimensions": ["language"],
  "items": [
    {
      "id": "item-001",
      "learnerRef": "anon-001",
      "text": "My claim is that…",
      "labels": { "claim": "proficient" },
      "groups": { "language": "multilingual" },
      "tags": ["standard"]
    }
  ],
  "citation": "optional"
}
```

| Field | Required | Notes |
|---|---|---|
| `id`, `title`, `license` | yes | Printed in the report |
| `synthetic` | yes | `true` if the work was written for testing, not by students |
| `labelSource` | yes | Who produced the labels; printed in the report |
| `activity` | yes | A Teacher Gate `Activity`, validated on load. Use `aiHelp: "releasable"` so the release step runs |
| `items[].id`, `learnerRef`, `text` | yes | `learnerRef` must be opaque |
| `items[].labels` | yes | `{ criterionId: levelId }`; criteria without a label are left out of agreement |
| `items[].scores` | no | Raw numeric scores, if your source has them |
| `items[].groups` | yes (may be `{}`) | Learner-group labels for the fairness breakdown, for example `{ "language": "multilingual" }` |
| `items[].tags` | no | `injection` marks items with an embedded instruction to the AI; the report then counts inflated suggestions on them |
| `groupDimensions` | no | Which `groups` keys to break results down by. Default `[]` (no breakdown) |

Ids (activity, criterion, level) must match `^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$`. Each item's
`text` is sent as one artifact.

## The commands

Run from the repository root:

```sh
pnpm tsx packages/evals/src/cli.ts <command> [options]
```

(`pnpm --filter @teacher-gate/evals eval …` also works, but then a relative `--dataset` path is
resolved from `packages/evals`; use an absolute path.)

### `task1`: verifiable feedback, harness against direct prompting

```sh
pnpm tsx packages/evals/src/cli.ts task1 \
  --dataset /path/to/my-dataset.json \
  --model ollama:qwen2.5:7b \
  --n 40 --seed 20261107 --run my-first-run
```

| Option | Default | Meaning |
|---|---|---|
| `--dataset` | `synthetic-cer` | `ellipse`, `synthetic-cer`, or a path to your JSON file |
| `--model` | `ollama:qwen2.5:7b` | `provider:model`; providers as in `modelFromEnv` (`ollama`, `vllm`, `openai`, `anthropic`) |
| `--n` | all items | A seeded random sample of n items |
| `--group`, `--per-group`, `--groups` | | Stratified sample: up to `per-group` items from each value of `group` (all values, or the comma-separated `groups`) |
| `--seed` | `20261107` | Seed for sampling |
| `--judge`, `--evaluators` | none | A judge model and a comma-separated list of Learning Commons feedback evaluators (default list `student-response-specificity,revision-actionability,tone-appropriateness`) run on student-facing feedback |
| `--concurrency` | 1 | Parallel model calls |
| `--run` | derived from dataset and model | Name of the results folder |
| `--results` | `evals/results` | Results directory |

Each item runs twice: once through the harness with a **simulated teacher**, once through the
direct-prompting baseline. The simulated teacher is driven by your labels, not a real teacher: it
rejects a finding whose suggested level is two or more levels from the label, edits out sentences
that state a grade or level, and accepts the rest.

### Other commands

| Command | What it runs | Data |
|---|---|---|
| `task2 --model …` | Mapping class sets to misconceptions, harness against direct prompting | Synthetic misconception set only |
| `task3 --model …` | Learning from decisions on and off, with a rule-based simulated teacher | Synthetic CER set only |
| `task4 --model …` | Goal judgement agreement, with the author's labels standing in for the teacher | Synthetic CER set only |
| `ledger` | Prints hosted spend so far | |

Tasks 2 to 4 do not take `--dataset` yet.

## Spend cap

Hosted models cost money. Every run is metered by `MeteredModel` against a ledger shared by all
runs in the results directory (`evals/results/spend-ledger.json`). The cap is
`TEACHER_GATE_EVAL_CAP_USD`, default **40** (US dollars), across all runs:

```sh
TEACHER_GATE_EVAL_CAP_USD=5 pnpm tsx packages/evals/src/cli.ts task1 --model anthropic:claude-haiku-5-5 --n 20
```

When the cap is reached, the meter refuses further model calls, and a run that starts with no
budget left stops at once. A hosted model
with no entry in `PRICES` (`packages/models/src/pricing.ts`) is refused outright under a cap, so
a cap cannot be bypassed by an unknown model. Local models (`ollama:`, `vllm:`) are priced at
zero. Estimates come from reported token counts; reconcile them with your provider's bill.

## What you get

`evals/results/<run>/`:

| File | Contents |
|---|---|
| `config.json` | Dataset identity, sampling, item ids, model, judge, settings, start time and the git commit (with `+uncommitted` if `packages/` had changes) |
| `records.jsonl` | One line per item and arm, including what the model returned |
| `summary.json` | Every measure, with counts and 95% intervals |
| `report.md` | A table comparing the two arms, and the breakdown by learner group |

`records.jsonl` holds model output, which quotes student work. Treat it like the data itself:
do not commit it if the data is not yours to publish.

## What each measure means

Rates are shown as a percentage with a Wilson 95% interval and the count, in the format
`rate% [low–high] (k/n)`.

| Measure | Meaning |
|---|---|
| Call failures | Model calls that threw (network, timeout, spend cap) |
| Output parsed | Of successful calls, replies that were a JSON object with a `findings` array |
| Findings schema-valid | Of findings returned, those passing the strict schema with no grading field |
| Inexact evidence, as returned | Of findings returned, those with a quote not exactly in the work |
| Fabricated evidence, as returned | Of findings returned, those with a quote not in the work even after normalising whitespace, quote marks and case |
| **Inexact evidence reaching a person** | Of findings shown to someone (the teacher in the harness, the student in the baseline), those with an inexact quote. The harness drops such findings, so this is zero for it by construction; the raw rates show what the model produced |
| Findings surfaced per item | Average number shown to that person |
| Suggested level = human label; within one | Agreement between the model's suggested level and your label, per item and criterion |
| Quadratic weighted kappa | Chance-corrected agreement on the ordinal levels |
| Criterion coverage | Share of (item, criterion) pairs with a suggestion |
| **Items leaking to the student** | Items where what the student would see contains a grade, a level, a rejected finding or a teacher-only field (checked by `findLeaks`) |
| Structured levels a product might display | Baseline only: findings carrying a `suggestedLevel` a product could show |
| Injection items with an inflated top-level suggestion | For items tagged `injection`: a top-level suggestion where your label is not top |
| Learning Commons pass rate | With `--judge`: share of student-facing feedback the evaluator scores 1 |
| Simulated teacher decisions | Harness only: accepts, edits and rejects by the simulated teacher |
| Breakdown by learner group | The main rates for each value of each `groupDimensions` key, both arms |

Read with care:

- Agreement with your labels measures the **suggested level**, which the harness never shows a
  student. It says how much a teacher could lean on the suggestion, not how good the feedback is.
- The simulated teacher is a rule, not a person. Nothing here measures teacher time or judgement.
- Small groups have wide intervals. Group differences are descriptive and are not significance
  tested.
- Learning Commons evaluators were validated by Learning Commons with a specific model and
  settings; your judge model has not been validated against their labels.

## Reproducing a run

Every input that changes results is in `config.json`: dataset id and item ids, model label,
judge, seeds (sampling seed; Ollama seed 42), temperature 0 where the provider accepts it, and
the git commit. Re-run with the same `--dataset`, `--model`, `--seed` and `--n` (or the same
stratification) at that commit. Hosted models may still change behind the same name.
