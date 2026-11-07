# Public goods

Teacher Gate uses open education datasets, misconception maps and evaluators ("public goods")
for context and evaluation. `packages/public-goods` holds one loader interface for them, a
registry of their status, and labelled synthetic placeholders for goods that are not released.

The registry in `packages/public-goods/src/registry.ts` is the source of truth. This page
summarises it as of 2026-11-07, the date each entry was last checked (by fetching the project
page, GitHub or Hugging Face APIs, or file headers).

## Status values

| Status | Meaning |
|---|---|
| `integrated` | Available, and a loader in this package uses it |
| `available-not-integrated` | Downloadable, no loader yet |
| `available-with-terms` | Needs an account, an application or acceptance of terms; no loader |
| `not-released` | Announced, not downloadable. A synthetic placeholder may stand in |

## The registry

| Id | Public good | Status | License (as published) | Teacher Gate use | Placeholder |
|---|---|---|---|---|---|
| `ellipse` | ELLIPSE corpus (Crossley et al.) | integrated | CC BY 4.0 | Task 1 evaluation: grade 8–12 English-learner essays with six analytic human scores and gender, grade, race/ethnicity and SES labels | |
| `lc-evaluators` | Learning Commons Evaluators: Feedback (ELA writing, 6–12) | integrated | Prompts and settings CC BY 4.0; code MIT | Judges of student-facing feedback in the evaluation suite; Task 4 goal evaluators | |
| `lc-knowledge-graph` | Learning Commons Knowledge Graph, open datasets (incl. Eedi misconceptions) | integrated | Open datasets CC BY 4.0 (some CC0); gated datasets not used | Math misconception entries with standards, for Task 2 and context | |
| `lc-agent-skills` | Learning Commons Agent Skills | integrated | Apache-2.0 | The SKILL.md format Teacher Gate's skills follow | |
| `asap2` | ASAP 2.0 | available-not-integrated | CC BY 4.0 | Planned: ELL vs non-ELL fairness comparison | |
| `persuade2` | PERSUADE 2.0 | available-not-integrated | CC BY 4.0 per the authors' README (Learning Commons' annotated copy is CC BY-NC-SA 4.0) | Planned: argumentative essays with discourse ratings and demographics | |
| `foundational-assist` | FoundationalASSIST | available-with-terms | CC BY-NC 4.0, gated | Not used: no misconception labels or demographics; gated | |
| `drawedumath` | DrawEduMath | available-not-integrated | CC BY-NC 4.0 on Hugging Face; CC BY-NC-SA 4.0 on the Program platform (they conflict) | Not used yet: handwritten math images; Teacher Gate is text-only | |
| `ncte-transcripts` | NCTE classroom transcripts | available-with-terms | Not stated; access by request | Not used: classroom discourse, not writing | |
| `playlab-cer` | Playlab CER science feedback data, rubric and de-identification pipeline | not-released | To be openly licensed | Task 1 data once released | `data/synthetic/cer-feedback.json` |
| `learning-equality` | Learning Equality science items, rubrics and misconception maps | not-released | To be openly licensed | Task 2 misconception maps once released | `data/synthetic/misconceptions.json` |
| `national-trail` | National Trail writing samples and feedback benchmark | not-released | To be openly licensed | Task 1 and 4 data once released; ELLIPSE stands in meanwhile | |
| `pitt-multidraft` | University of Pittsburgh multi-draft essays and anonymization tools | not-released | To be openly licensed | Task 1 multi-draft data and de-identification | |
| `quill-feedback` | Quill teacher feedback examples | not-released | To be openly licensed | Task 3 style reference | |
| `kb-tutorbench` | Stanford KB-TutorBench | not-released | To be openly licensed | Task 2 and 4 comparisons | |

The last six are grantees of Digital Promise's K-12 AI Infrastructure Program. Their goods were
not downloadable when checked.

## Real, synthetic and unavailable

**Real data, downloaded at run time.** ELLIPSE, the Learning Commons evaluators and the Knowledge
Graph extract are fetched by loaders into `data/downloads/` (or `TEACHER_GATE_DATA_DIR`), which is
git-ignored. They are never committed or redistributed here.

- `loadEllipse()` downloads the ELLIPSE train CSV at a pinned commit and checks its SHA-256.
- `loadLcEvaluator(id)` downloads one evaluator's prompts at a pinned commit and checks each
  against the SHA-256 its `config.json` declares.
- `downloadKgMisconceptions()` streams the Knowledge Graph export (`v1.16.0`, about 1 GB) once and
  writes a small extract of misconception nodes and their direct relationships:
  `pnpm --filter @teacher-gate/public-goods fetch:kg`. `readKgExtract()` and `kgMisconceptions()`
  turn it into `Misconception` entries.

**Synthetic placeholders, committed.** `data/synthetic/` holds two small datasets written for
Teacher Gate (CC-BY-4.0). They stand in for the Playlab and Learning Equality goods. Every
paragraph and label was invented by the dataset's author. **Labels have not been validated by
teachers.** Loaders mark them `synthetic: true` and append "SYNTHETIC placeholder for …" to the
title, and evaluation reports print that label. See
[data/synthetic/README.md](../data/synthetic/README.md).

**Unavailable.** Goods with status `not-released` have no loader. Goods that are gated or
non-commercial are recorded with the reason they are not used.

## Loader shapes

Every loader returns one of the shapes in `packages/public-goods/src/types.ts`, so evaluation code
does not need to know a dataset's native format:

- `ScoredWritingDataset`: an `Activity` (rubric) plus scored items
  `{ id, learnerRef, text, labels: { criterionId: levelId }, scores?, groups, tags? }`, with
  `license`, `synthetic`, `labelSource`, `groupDimensions` and `citation`. See
  [run on your own data](run-on-your-own-data.md).
- `MisconceptionDataset`: a `catalog` of `Misconception` entries and labelled class sets.

## Adding a loader

1. Add or update the entry in `PUBLIC_GOODS` (`registry.ts`): status, the license as the
   publisher states it, whether it may be redistributed, its use, and how and when you checked.
2. Write a loader in `packages/public-goods/src/<id>.ts` that returns `ScoredWritingDataset` or
   `MisconceptionDataset`:
   - Download with `cachedDownload(url, localPath, expectedSha256)`. Pin a commit or version and a
     checksum. Never commit the data.
   - Map the source's rubric to an `Activity` and its scores to level ids.
   - Keep only the group labels the source provides; never infer demographics.
   - Set `synthetic: false`, `labelSource` (who produced the labels) and `citation`.
3. Export it from `src/index.ts`.
4. Add a test that runs without network access (parse a few inline rows, as
   `public-goods.test.ts` does for ELLIPSE).
5. If the evaluation CLI should load it by name, add a case to `dataset()` in
   `packages/evals/src/cli.ts`. Otherwise users can pass a JSON file.
6. Update this page and `docs/licensing.md`.

The registry test checks that every good is recorded once and that only `not-released` goods
have placeholders.

## Swapping a placeholder when Playlab or Learning Equality release

When Playlab's CER feedback data or Learning Equality's misconception maps are published:

1. Check the release's license, terms and de-identification. Record them in the registry entry
   and set its status to `integrated` once a loader exists. Remove its `placeholder` field.
2. Write a loader that returns the same shape as the matching synthetic loader:
   `loadSyntheticCer()` → `ScoredWritingDataset`; `loadSyntheticMisconceptions()` →
   `MisconceptionDataset`. Set `synthetic: false`.
3. Map the release's rubric and misconception ids to Teacher Gate's `Activity` and
   `Misconception` schemas. Keep the source's ids in `source` (for example `playlab:…`).
4. Point the evaluation CLI at it (a new `--dataset` name) and re-run the evaluations. Report
   synthetic and real results separately.
5. Keep the synthetic files as fixtures for tests that must not depend on a download.

Until then, any result on the synthetic sets measures the harness's mechanics, not real
classroom performance.
