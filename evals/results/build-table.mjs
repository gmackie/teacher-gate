#!/usr/bin/env node
// Builds evals/results/RESULTS.md: one table of every committed run, from each run's summary.json
// and the spend ledger. No dependencies. Usage: node evals/results/build-table.mjs [results dir]
// When the directory has a `round2` folder, the round 1 → round 2 comparison (compare-rounds.mjs)
// is appended. Run it once for evals/results and once for evals/results/round2.
//
// Rates print as "k/n (pp.p%)", rounded half-up to one decimal in both arms alike; the exact k/n
// is always shown. The "Result" column compares point estimates and says when the 95% Wilson
// intervals overlap, i.e. when the difference is not distinguishable at this n.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareRounds } from "./compare-rounds.mjs";

const dir = process.argv[2] ?? dirname(fileURLToPath(import.meta.url));
const ledger = JSON.parse(readFileSync(join(dir, "spend-ledger.json"), "utf8"));

const pct = (x) => (Math.round(x * 1000) / 10).toFixed(1);
const fmtRate = (r) => (r == null || r.n === 0 ? "n/a" : `${r.k}/${r.n} (${pct(r.rate)}%)`);
const fmtNum = (x, d = 3) => (x == null ? "n/a" : x.toFixed(d));
const overlap = (a, b) => a.ci95 && b.ci95 && a.ci95[0] <= b.ci95[1] && b.ci95[0] <= a.ci95[1];

/** Compares baseline `b` with harness `h`; `better` is "lower" or "higher". */
function verdict(b, h, better, isRate = true) {
  const bv = isRate ? b?.rate : b;
  const hv = isRate ? h?.rate : h;
  if (bv == null || hv == null || (isRate && (b.n === 0 || h.n === 0))) return "n/a";
  if (hv === bv) return "**tie**";
  const win = better === "lower" ? hv < bv : hv > bv;
  const ci = isRate && overlap(b, h) ? " (CIs overlap)" : "";
  return win ? `harness better${ci}` : `**harness worse**${ci}`;
}

/** Spend per run from the ledger, summing every entry for the run (including aborted attempts). */
function spend(run) {
  let total = 0;
  for (const r of ledger.runs) if (r.run === run || r.run.startsWith(`${run} `)) total += Object.values(r.models).reduce((a, b) => a + b, 0);
  return total;
}

const runs = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "summary.json")))
  .map((d) => d.name)
  .sort();

const rows = [];
const head = (task, data, model, n, judge, run) => ({ task, data, model, n, judge, run, spend: `$${spend(run).toFixed(4)}` });
for (const run of runs) {
  const s = JSON.parse(readFileSync(join(dir, run, "summary.json"), "utf8"));
  const task = run.split("-")[0];
  let first = true;
  const push = (meta, measure, b, h, v) => {
    rows.push({ ...meta, measure, b, h, v, showMeta: first });
    first = false;
  };
  if (task === "task1") {
    const c = s.config;
    const data = c.dataset.synthetic ? `SYNTHETIC (${c.dataset.id})` : `REAL (${c.dataset.id})`;
    const meta = head("1 Verifiable rubric feedback", data, c.model, c.n, c.judge ?? "none", run);
    const H = s.harness;
    const B = s.baseline;
    push(meta, "Findings with inexact evidence, raw (lower better)", fmtRate(B.inexactEvidenceRaw), fmtRate(H.inexactEvidenceRaw), verdict(B.inexactEvidenceRaw, H.inexactEvidenceRaw, "lower"));
    push(meta, "Findings with fabricated evidence, raw (lower better)", fmtRate(B.fabricatedEvidenceRaw), fmtRate(H.fabricatedEvidenceRaw), verdict(B.fabricatedEvidenceRaw, H.fabricatedEvidenceRaw, "lower"));
    push(meta, "Inexact evidence reaching a person (lower better)", fmtRate(B.inexactEvidenceSurfaced), fmtRate(H.inexactEvidenceSurfaced), verdict(B.inexactEvidenceSurfaced, H.inexactEvidenceSurfaced, "lower"));
    push(meta, "Findings schema-valid (higher better)", fmtRate(B.findingSchemaValid), fmtRate(H.findingSchemaValid), verdict(B.findingSchemaValid, H.findingSchemaValid, "higher"));
    push(meta, "Output parsed (higher better)", fmtRate(B.outputParsed), fmtRate(H.outputParsed), verdict(B.outputParsed, H.outputParsed, "higher"));
    push(meta, "Suggested level = label, exact (higher better)", fmtRate(B.agreement.exact), fmtRate(H.agreement.exact), verdict(B.agreement.exact, H.agreement.exact, "higher"));
    push(meta, "Suggested level within one (higher better)", fmtRate(B.agreement.withinOne), fmtRate(H.agreement.withinOne), verdict(B.agreement.withinOne, H.agreement.withinOne, "higher"));
    push(meta, "Quadratic weighted kappa (higher better)", fmtNum(B.agreement.qwk), fmtNum(H.agreement.qwk), verdict(B.agreement.qwk, H.agreement.qwk, "higher", false));
    push(meta, "Items leaking grade/level/rejected text to student (lower better)", fmtRate(B.leakage.itemsLeaking), fmtRate(H.leakage.itemsLeaking), verdict(B.leakage.itemsLeaking, H.leakage.itemsLeaking, "lower"));
    for (const [id, r] of Object.entries(H.lcPass ?? {})) {
      push(meta, `LC judge \`${id}\` pass (higher better)`, fmtRate(B.lcPass?.[id]), fmtRate(r), verdict(B.lcPass?.[id], r, "higher"));
    }
  } else if (task === "task2") {
    const meta = head("2 Class misconception brief", "SYNTHETIC (misconceptions)", s.model, "42 responses / 3 class sets", "none (author labels)", run);
    const H = s.harness;
    const B = s.baseline;
    push(meta, "Mapping precision vs labels (higher better)", fmtRate(B.precision), fmtRate(H.precision), verdict(B.precision, H.precision, "higher"));
    push(meta, "Mapping recall vs labels (higher better)", fmtRate(B.recall), fmtRate(H.recall), verdict(B.recall, H.recall, "higher"));
    push(meta, "F1 (higher better)", fmtNum(B.f1), fmtNum(H.f1), verdict(B.f1, H.f1, "higher", false));
    push(meta, "Mappings with a quote not in the response, raw (lower better)", fmtRate(B.badEvidenceRaw), fmtRate(H.badEvidenceRaw), verdict(B.badEvidenceRaw, H.badEvidenceRaw, "lower"));
    push(meta, "Such mappings reaching the teacher (lower better)", fmtRate(B.badEvidenceSurfaced), fmtRate(H.badEvidenceSurfaced), verdict(B.badEvidenceSurfaced, H.badEvidenceSurfaced, "lower"));
    push(meta, "Mappings naming an unknown misconception (lower better)", fmtRate(B.unknownMisconceptionRaw), fmtRate(H.unknownMisconceptionRaw), verdict(B.unknownMisconceptionRaw, H.unknownMisconceptionRaw, "lower"));
  } else if (task === "task3") {
    const [off, on] = s.summary;
    const meta = head("3 Teacher guidance (baseline = learning off, harness = learning on)", "SYNTHETIC (cer-feedback), simulated teacher", s.model, `${off.items} items after 8 warm-up`, "none (rule-based teacher)", run);
    push(meta, "Findings on the always-rejected criterion (lower better)", fmtRate(off.rejectedCriterionShare), fmtRate(on.rejectedCriterionShare), verdict(off.rejectedCriterionShare, on.rejectedCriterionShare, "lower"));
    push(meta, "Findings accepted unedited (higher better)", fmtRate(off.acceptedUnedited), fmtRate(on.acceptedUnedited), verdict(off.acceptedUnedited, on.acceptedUnedited, "higher"));
    push(meta, "Findings already in the teacher's style (higher better)", fmtRate(off.inTeacherStyle), fmtRate(on.inTeacherStyle), verdict(off.inTeacherStyle, on.inTeacherStyle, "higher"));
  } else if (task === "task4") {
    const r = s.summary;
    const meta = head("4 Teacher goals (single arm, no baseline)", "SYNTHETIC (cer-feedback), author label as teacher", s.model, r.items, "none (author labels)", run);
    push(meta, "Agreement with stand-in teacher judgement", "no baseline arm", fmtRate(r.agreement), "n/a");
    push(meta, "Cohen's kappa", "no baseline arm", fmtNum(r.kappa), "n/a");
    push(meta, "Judgements left unverified (lower better)", "no baseline arm", fmtRate(r.unverified), "n/a");
    push(meta, "Confusion tp/fp/fn/tn", "no baseline arm", `${r.confusion.tp}/${r.confusion.fp}/${r.confusion.fn}/${r.confusion.tn}`, "n/a");
  }
}

const losses = rows.filter((r) => r.v.includes("worse") || r.v.includes("tie"));

// Fairness gaps on real data: for each dimension, the highest minus the lowest group rate, in
// percentage points, per arm. Groups with fewer than 10 items are left out of the gap (ELLIPSE's
// grade 9 and 10 cells have 2 items each) and listed instead.
const fair = [];
const MEASURES = [
  ["inexactEvidenceRaw", "Inexact evidence, raw"],
  ["inexactEvidenceSurfaced", "Inexact evidence reaching a person"],
  ["exactAgreement", "Exact agreement"],
  ["withinOne", "Within one"],
  ["leaking", "Items leaking"],
];
for (const run of runs) {
  const s = JSON.parse(readFileSync(join(dir, run, "summary.json"), "utf8"));
  if (!run.startsWith("task1") || s.config?.dataset?.synthetic !== false || !Array.isArray(s.fairness)) continue;
  for (const dim of [...new Set(s.fairness.map((f) => f.dimension))]) {
    const small = [...new Set(s.fairness.filter((f) => f.dimension === dim && f.items < 10).map((f) => `${f.value} (${f.items})`))];
    for (const [key, label] of MEASURES) {
      const gap = (arm) => {
        const g = s.fairness.filter((f) => f.dimension === dim && f.arm === arm && f.items >= 10 && f[key]?.n > 0);
        if (g.length < 2) return null;
        const lo = g.reduce((a, b) => (b[key].rate < a[key].rate ? b : a));
        const hi = g.reduce((a, b) => (b[key].rate > a[key].rate ? b : a));
        return { pp: (hi[key].rate - lo[key].rate) * 100, lo: `${lo.value} ${fmtRate(lo[key])}`, hi: `${hi.value} ${fmtRate(hi[key])}` };
      };
      const b = gap("baseline");
      const h = gap("harness");
      if (b === null || h === null) continue;
      const v = Math.abs(h.pp - b.pp) < 0.05 ? "**tie**" : h.pp < b.pp ? "harness narrower" : "**harness wider**";
      fair.push(`| ${run} | ${dim} | ${label} | ${b.pp.toFixed(1)} pp (${b.lo} to ${b.hi}) | ${h.pp.toFixed(1)} pp (${h.lo} to ${h.hi}) | ${v} | ${small.join(", ")} |`);
    }
  }
}
const md = [
  "# Teacher Gate evaluation results",
  "",
  "Generated by `node evals/results/build-table.mjs` from the `summary.json` of every run folder here. Do not edit by hand.",
  "",
  "- **REAL** marks data collected from students (ELLIPSE, CC BY 4.0). **SYNTHETIC** marks data the Teacher Gate authors wrote and labelled as placeholders for unreleased public goods; results on it show the mechanism works, not how it performs on students' work.",
  "- Rates are `k/n (percent)`, the percent rounded to one decimal the same way for both arms; the counts are exact. \"CIs overlap\" means the 95% Wilson intervals of the two arms overlap, so the difference is not distinguishable at this sample size.",
  "- Baseline = direct prompting with the same model, rubric and work (Tasks 1–2); for Task 3 it is the same harness with learning off. Task 4 has no baseline arm.",
  "- Judge: Learning Commons feedback evaluators run on `anthropic/claude-haiku-5-5`, not the evaluators' validated model. LLM-as-judge scores are not teacher judgements.",
  "- Spend is the hosted-API estimate from `spend-ledger.json` (open-weight runs cost only their judge calls). It includes aborted attempts of the same run.",
  "",
  `Total hosted spend recorded in the ledger: **$${ledger.totalUsd.toFixed(4)}** of a $${ledger.capUsd} cap (includes the separate experiment and diagnostics listed in the ledger).`,
  "",
  "| Task | Dataset | Model | n | Judge | Measure | Baseline | Harness | Result | Run spend |",
  "|---|---|---|---|---|---|---|---|---|---|",
  ...rows.map((r) =>
    r.showMeta
      ? `| ${r.task} | ${r.data} | ${r.model} | ${r.n} | ${r.judge} | ${r.measure} | ${r.b} | ${r.h} | ${r.v} | ${r.spend} |`
      : `| | | | | | ${r.measure} | ${r.b} | ${r.h} | ${r.v} | |`,
  ),
  "",
  `## Where the harness loses or ties (${losses.length} rows)`,
  "",
  "| Run | Measure | Baseline | Harness | Result |",
  "|---|---|---|---|---|",
  ...losses.map((r) => `| ${r.run} | ${r.measure} | ${r.b} | ${r.h} | ${r.v} |`),
  "",
  "## Fairness gaps on real data (ELLIPSE)",
  "",
  "Gap = highest minus lowest group rate in percentage points, per arm, over groups with at least 10 items. Groups are small (20 items per race/ethnicity group; other dimensions are unbalanced), intervals are wide and nothing here is significance-tested. A narrower gap is not better if every group got worse. The Learning Commons judge pass rates are not broken down by group.",
  "",
  "| Run | Dimension | Measure | Baseline gap | Harness gap | Result | Groups left out (items) |",
  "|---|---|---|---|---|---|---|",
  ...fair,
  "",
].join("\n");
const withRounds = existsSync(join(dir, "round2", "spend-ledger.json")) ? `${md}\n${compareRounds(dir, join(dir, "round2"))}` : md;
writeFileSync(join(dir, "RESULTS.md"), withRounds);
console.log(`wrote RESULTS.md: ${runs.length} runs, ${rows.length} rows, ${losses.length} losses or ties`);
