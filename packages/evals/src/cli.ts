#!/usr/bin/env -S npx tsx
// teacher-gate-eval: run the evaluation suite.
//
//   task1 --dataset ellipse|synthetic-cer|<path to your dataset.json> --model provider:model
//         [--n 80] [--per-group 20 --group race_ethnicity [--groups a,b]] [--seed 20261107]
//         [--judge anthropic:claude-haiku-5-5 --evaluators a,b] [--concurrency 2] [--run name]
//   task2 --model provider:model [--run name]
//   task3 --model provider:model [--run name]     (simulation, synthetic data)
//   task4 --model provider:model [--run name]     (synthetic data, author labels as the teacher)
//   ledger                       show hosted spend so far
//
// "Run on your own data": pass --dataset with a JSON file in the ScoredWritingDataset shape
// (see docs/run-on-your-own-data.md). Results go to evals/results/<run>/. Hosted spend is capped
// by TEACHER_GATE_EVAL_CAP_USD (default 40) across every run sharing the results directory.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Activity } from "@teacher-gate/core";
import { MeteredModel } from "@teacher-gate/models";
import { loadEllipse, loadSyntheticCer, loadSyntheticMisconceptions, REPO_ROOT, type LcFeedbackEvaluatorId, type ScoredWritingDataset } from "@teacher-gate/public-goods";
import { fmt, fmtCi } from "./metrics";
import { modelFromSpec, readLedger, runTask1 } from "./run";
import { shuffle, stratifiedSample } from "./stats";
import { runTask2, summariseTask2 } from "./task2";
import { runTask3, runTask4 } from "./task34";

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name: string, fallback?: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const resultsDir = resolve(opt("results", join(REPO_ROOT, "evals", "results"))!);
const cap = Number(process.env.TEACHER_GATE_EVAL_CAP_USD ?? 40);
mkdirSync(resultsDir, { recursive: true });

async function dataset(name: string): Promise<ScoredWritingDataset> {
  if (name === "ellipse") return loadEllipse();
  if (name === "synthetic-cer") return loadSyntheticCer();
  const raw = JSON.parse(readFileSync(resolve(name), "utf8")) as ScoredWritingDataset;
  return { ...raw, activity: Activity.parse(raw.activity), groupDimensions: raw.groupDimensions ?? [] };
}

async function task1(): Promise<void> {
  const ds = await dataset(opt("dataset", "synthetic-cer")!);
  const seed = Number(opt("seed", "20261107"));
  const group = opt("group");
  const perGroup = opt("per-group");
  let items = ds.items;
  let sampling = `all ${items.length} items`;
  if (group !== undefined && perGroup !== undefined) {
    const groups = (opt("groups") ?? [...new Set(items.map((i) => i.groups[group] ?? ""))].join(",")).split(",");
    items = stratifiedSample(items, (i) => i.groups[group] ?? "", groups, Number(perGroup), seed);
    sampling = `stratified by ${group} (${groups.join("; ")}), up to ${perGroup} each, seed ${seed}`;
  } else if (opt("n") !== undefined && Number(opt("n")) < items.length) {
    items = shuffle(items, seed).slice(0, Number(opt("n")));
    sampling = `${items.length} of ${ds.items.length} items, seeded shuffle ${seed}`;
  }
  const model = opt("model", "ollama:qwen2.5:7b")!;
  const run = opt("run", `task1-${ds.id}-${model.replace(/[^a-z0-9.]+/gi, "-")}`)!;
  const judge = opt("judge");
  const result = await runTask1({
    run,
    resultsDir,
    dataset: ds,
    items,
    sampling,
    modelSpec: model,
    ...(judge === undefined ? {} : { judgeSpec: judge, evaluators: opt("evaluators", "student-response-specificity,revision-actionability,tone-appropriateness")!.split(",") as LcFeedbackEvaluatorId[] }),
    concurrency: Number(opt("concurrency", "1")),
    ledgerCapUsd: cap,
    log: (s) => console.error(s),
  });
  console.log(readFileSync(join(resultsDir, run, "report.md"), "utf8"));
  console.error(`spent $${result.spentUsd.toFixed(4)}`);
}

async function task2(): Promise<void> {
  const data = loadSyntheticMisconceptions();
  const ledgerPath = join(resultsDir, "spend-ledger.json");
  const model = new MeteredModel(modelFromSpec(opt("model", "ollama:qwen2.5:7b")!), cap - readLedger(ledgerPath, cap).totalUsd);
  const run = opt("run", `task2-${data.id}-${model.label.replace(/[^a-z0-9.]+/gi, "-")}`)!;
  const records = await runTask2(model, data);
  const h = summariseTask2(data, records, "harness");
  const b = summariseTask2(data, records, "baseline");
  const dir = join(resultsDir, run);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "records.jsonl"), records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const fresh = readLedger(ledgerPath, cap);
  fresh.totalUsd += model.spentUsd;
  fresh.runs.push({ run, at: new Date().toISOString(), models: { [model.label]: model.spentUsd } });
  writeFileSync(ledgerPath, JSON.stringify(fresh, null, 2));
  const md = [
    `# Task 2 evaluation: ${run}`,
    "",
    `- Dataset: ${data.title} (${data.license}) — **SYNTHETIC data, author-labelled**`,
    `- ${data.classSets.length} class sets, ${data.classSets.reduce((n, s) => n + s.responses.length, 0)} responses, ${data.catalog.length} catalog entries`,
    `- Model: ${model.label}; estimated spend $${model.spentUsd.toFixed(4)}`,
    "",
    "| Measure | Harness | Direct prompting |",
    "|---|---|---|",
    `| Mapping precision vs labels | ${fmtCi(h.precision)} | ${fmtCi(b.precision)} |`,
    `| Mapping recall vs labels | ${fmtCi(h.recall)} | ${fmtCi(b.recall)} |`,
    `| F1 | ${h.f1?.toFixed(3) ?? "n/a"} | ${b.f1?.toFixed(3) ?? "n/a"} |`,
    `| Mappings returned with a quote not in that response | ${fmt(h.badEvidenceRaw)} | ${fmt(b.badEvidenceRaw)} |`,
    `| **Such mappings reaching the teacher** | ${fmt(h.badEvidenceSurfaced)} | ${fmt(b.badEvidenceSurfaced)} |`,
    `| Mappings naming a misconception not in the catalog | ${fmt(h.unknownMisconceptionRaw)} | ${fmt(b.unknownMisconceptionRaw)} |`,
    "",
    "Precision and recall are before the teacher's confirmation step, which removes wrong mappings in the harness.",
    "",
  ].join("\n");
  writeFileSync(join(dir, "report.md"), md);
  writeFileSync(join(dir, "summary.json"), JSON.stringify({ run, model: model.label, harness: h, baseline: b, spentUsd: model.spentUsd }, null, 2));
  console.log(md);
}

/** Runs a metered synthetic-data task, records spend and writes report.md and summary.json. */
async function synthetic(name: "task3" | "task4"): Promise<void> {
  const ds = loadSyntheticCer();
  const ledgerPath = join(resultsDir, "spend-ledger.json");
  const model = new MeteredModel(modelFromSpec(opt("model", "ollama:qwen2.5:7b")!), cap - readLedger(ledgerPath, cap).totalUsd);
  const run = opt("run", `${name}-${ds.id}-${model.label.replace(/[^a-z0-9.]+/gi, "-")}`)!;
  const dir = join(resultsDir, run);
  mkdirSync(dir, { recursive: true });
  let md: string;
  let summary: unknown;
  if (name === "task3") {
    const arms = await runTask3(model, ds, { rejectCriterion: "claim" });
    const [off, on] = [arms[0]!, arms[1]!];
    summary = arms;
    md = [
      `# Task 3 simulation: ${run}`,
      "",
      `- Dataset: ${ds.title} — **SYNTHETIC data**; simulated rule-based teacher (rejects every "claim" finding; rewrites others to start "Next step:"), not a real teacher`,
      `- Model: ${model.label}; first 8 items are warm-up; ${off.items} items measured per arm; estimated spend $${model.spentUsd.toFixed(4)}`,
      "",
      "| Measure (after warm-up) | Learning off | Learning on |",
      "|---|---|---|",
      `| Findings on the always-rejected criterion | ${fmtCi(off.rejectedCriterionShare)} | ${fmtCi(on.rejectedCriterionShare)} |`,
      `| Findings accepted unedited | ${fmtCi(off.acceptedUnedited)} | ${fmtCi(on.acceptedUnedited)} |`,
      `| Findings already in the teacher's style | ${fmtCi(off.inTeacherStyle)} | ${fmtCi(on.inTeacherStyle)} |`,
      `| Preferences applied at the end | ${off.appliedPreferencesAtEnd.length} | ${on.appliedPreferencesAtEnd.join(", ")} |`,
      "",
    ].join("\n");
  } else {
    const r = await runTask4(model, ds, { statement: "Uses measured data from the investigation as evidence for the claim.", criterionId: "evidence" });
    summary = r;
    md = [
      `# Task 4 evaluation: ${run}`,
      "",
      `- Dataset: ${ds.title} — **SYNTHETIC data**; the author's evidence label above "beginning" stands in for the teacher's judgement`,
      `- Goal: "${r.goal}"; model ${model.label}; ${r.items} items; estimated spend $${model.spentUsd.toFixed(4)}`,
      "",
      "| Measure | Value |",
      "|---|---|",
      `| Agreement with the stand-in teacher judgement (verified judgements) | ${fmtCi(r.agreement)} |`,
      `| Cohen's kappa | ${r.kappa?.toFixed(3) ?? "n/a"} |`,
      `| Judgements left unverified (quote not in the work, or unparseable) | ${fmt(r.unverified)} |`,
      `| Confusion (tp / fp / fn / tn) | ${r.confusion.tp} / ${r.confusion.fp} / ${r.confusion.fn} / ${r.confusion.tn} |`,
      "",
    ].join("\n");
  }
  writeFileSync(join(dir, "report.md"), md);
  writeFileSync(join(dir, "summary.json"), JSON.stringify({ run, model: model.label, summary, spentUsd: model.spentUsd }, null, 2));
  const fresh = readLedger(ledgerPath, cap);
  fresh.totalUsd += model.spentUsd;
  fresh.runs.push({ run, at: new Date().toISOString(), models: { [model.label]: model.spentUsd } });
  writeFileSync(ledgerPath, JSON.stringify(fresh, null, 2));
  console.log(md);
}

if (cmd === "task1") await task1();
else if (cmd === "task3" || cmd === "task4") await synthetic(cmd);
else if (cmd === "task2") await task2();
else if (cmd === "ledger") console.log(JSON.stringify(readLedger(join(resultsDir, "spend-ledger.json"), cap), null, 2));
else {
  console.error("usage: teacher-gate-eval task1|task2|ledger [options]; see the header of src/cli.ts");
  process.exit(1);
}
