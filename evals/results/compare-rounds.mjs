#!/usr/bin/env node
// Compares evaluation round 1 (the run folders in evals/results) with round 2 (evals/results/round2),
// measure by measure, for the harness and the baseline arm. No dependencies. build-table.mjs appends
// its output to RESULTS.md; run alone it prints Markdown:
//   node evals/results/compare-rounds.mjs [round 1 dir] [round 2 dir]
//
// Rates print as "k/n (pp.p%)", rounded half-up to one decimal the same way in every column. A change
// is "better" or "worse" by point estimate in the measure's direction; "(CIs overlap)" says the 95%
// Wilson intervals of the two rounds overlap, so the change is not distinguishable at this n.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pct = (x) => (Math.round(x * 1000) / 10).toFixed(1);
const isRate = (v) => v != null && typeof v === "object" && "k" in v;
const show = (v, d = 3) => (v == null ? "n/a" : isRate(v) ? (v.n === 0 ? "n/a" : `${v.k}/${v.n} (${pct(v.rate)}%)`) : typeof v === "number" ? v.toFixed(d) : String(v));
const valueOf = (v) => (isRate(v) ? (v.n === 0 ? null : v.rate) : typeof v === "number" ? v : null);
const overlap = (a, b) => isRate(a) && isRate(b) && a.ci95 && b.ci95 && a.ci95[0] <= b.ci95[1] && b.ci95[0] <= a.ci95[1];

/** "better", "worse" or "same" for a move from `a` to `b` in direction `better` ("higher"/"lower"/null). */
function change(a, b, better) {
  const x = valueOf(a);
  const y = valueOf(b);
  if (x == null || y == null) return "n/a";
  if (better == null) return y === x ? "same" : y > x ? "up" : "down";
  if (Math.abs(y - x) < 1e-12) return "same";
  const win = better === "lower" ? y < x : y > x;
  const ci = overlap(a, b) ? " (CIs overlap)" : "";
  return win ? `better${ci}` : `**worse**${ci}`;
}

/** The measures compared, per task: [label, direction, baseline getter, harness getter]. */
function measures(task, s) {
  if (task === "task1") {
    const m = (label, better, get) => [label, better, get(s.baseline), get(s.harness)];
    const out = [
      m("Findings with inexact evidence, raw", "lower", (a) => a.inexactEvidenceRaw),
      m("Findings with fabricated evidence, raw", "lower", (a) => a.fabricatedEvidenceRaw),
      m("Inexact evidence reaching a person", "lower", (a) => a.inexactEvidenceSurfaced),
      m("Findings schema-valid", "higher", (a) => a.findingSchemaValid),
      m("Output parsed", "higher", (a) => a.outputParsed),
      m("Findings reaching a person per item", null, (a) => a.findingsSurfacedPerItem),
      m("Criterion coverage (item×criterion with a suggested level)", "higher", (a) => a.agreement.coverage),
      m("Suggested level = label, exact", "higher", (a) => a.agreement.exact),
      m("Suggested level within one", "higher", (a) => a.agreement.withinOne),
      m("Quadratic weighted kappa", "higher", (a) => a.agreement.qwk),
      m("Items leaking grade/level/rejected text to student", "lower", (a) => a.leakage.itemsLeaking),
    ];
    for (const id of ["student-response-specificity", "revision-actionability", "tone-appropriateness"]) out.push(m(`LC judge \`${id}\` pass`, "higher", (a) => a.lcPass?.[id]));
    return out;
  }
  if (task === "task2") {
    const m = (label, better, key) => [label, better, s.baseline[key], s.harness[key]];
    return [
      m("Mapping precision vs labels", "higher", "precision"),
      m("Mapping recall vs labels", "higher", "recall"),
      m("F1", "higher", "f1"),
      m("Mappings with a quote not in the response, raw", "lower", "badEvidenceRaw"),
      m("Such mappings reaching the teacher", "lower", "badEvidenceSurfaced"),
      m("Mappings naming an unknown misconception", "lower", "unknownMisconceptionRaw"),
    ];
  }
  if (task === "task3") {
    const [off, on] = s.summary;
    return [
      ["Findings on the always-rejected criterion, reaching the teacher", "lower", off.rejectedCriterionShare, on.rejectedCriterionShare],
      ["Findings reaching the teacher per item (after warm-up)", null, off.findingsPerItem, on.findingsPerItem],
      ["Findings accepted unedited", "higher", off.acceptedUnedited, on.acceptedUnedited],
      ["Findings already in the teacher's style", "higher", off.inTeacherStyle, on.inTeacherStyle],
    ];
  }
  if (task === "task4") {
    const r = s.summary;
    return [
      ["Agreement with stand-in teacher judgement", "higher", null, r.agreement],
      ["Cohen's kappa", "higher", null, r.kappa],
      ["Judgements left unverified", "lower", null, r.unverified],
    ];
  }
  return [];
}

function runsIn(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "summary.json")))
    .map((d) => d.name)
    .sort();
}

function ledgerTotal(dir) {
  const p = join(dir, "spend-ledger.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")).totalUsd : 0;
}

/** Markdown comparing the two rounds. */
export function compareRounds(r1, r2) {
  const runs = [...new Set([...runsIn(r1), ...runsIn(r2)])].sort();
  const rows = [];
  const notes = [];
  for (const run of runs) {
    const a = existsSync(join(r1, run, "summary.json")) ? JSON.parse(readFileSync(join(r1, run, "summary.json"), "utf8")) : undefined;
    const b = existsSync(join(r2, run, "summary.json")) ? JSON.parse(readFileSync(join(r2, run, "summary.json"), "utf8")) : undefined;
    const task = run.split("-")[0];
    const ma = a === undefined ? [] : measures(task, a);
    const mb = b === undefined ? [] : measures(task, b);
    const labels = (mb.length > 0 ? mb : ma).map((x) => x[0]);
    for (const label of labels) {
      const x = ma.find((m) => m[0] === label);
      const y = mb.find((m) => m[0] === label);
      const better = (y ?? x)[1];
      const [b1, h1] = x === undefined ? [null, null] : [x[2], x[3]];
      const [b2, h2] = y === undefined ? [null, null] : [y[2], y[3]];
      rows.push({ run, label: `${label}${better === "lower" ? " (lower better)" : better === "higher" ? " (higher better)" : ""}`, b1, b2, h1, h2, delta: change(h1, h2, better), vsBase: y === undefined ? "not in round 2" : b2 == null ? "no baseline arm" : change(b2, h2, better).replace("better", "harness better").replace("**worse**", "**harness worse**").replace(/^same$/, "**tie**") });
    }
    const drops = b?.harness?.harnessDrops;
    if (drops !== undefined) notes.push(`| ${run} | ${Object.entries(drops.byReason).map(([k, n]) => `${k} ${n}`).join(", ") || "none"} | ${drops.repeatFlags} |`);
  }
  const worse = rows.filter((r) => r.delta.includes("worse"));
  const r1Total = ledgerTotal(r1);
  const r2Total = ledgerTotal(r2);
  return [
    "## Round 1 → round 2",
    "",
    "Round 2 re-ran every task on every model with the same datasets, samples, seeds, n and judge, after three changes (SCHO-347, PR #9): findings address the student with one next step by default; criteria the teacher keeps rejecting are held back in code; near-duplicate findings are removed and release is blocked when an accepted finding repeats a rejected one. Round 1 is the table above; round 2's own table is in [`round2/RESULTS.md`](round2/RESULTS.md).",
    "",
    "Hosted model outputs differ run to run even with the same prompt, so some change is noise: Tasks 2 and 4 use prompts the fixes did not touch, and their round-to-round differences show the size of that noise. Task 3's arms differ by design: \"baseline\" is learning off, \"harness\" learning on.",
    "",
    `Spend: round 1 ledger $${r1Total.toFixed(4)} (including its separate experiment and diagnostics); round 2 $${(r2Total - r1Total).toFixed(4)} (its ledger carries round 1 over, total $${r2Total.toFixed(4)} of the $40 cap).`,
    "",
    "| Run | Measure | Baseline r1 | Baseline r2 | Harness r1 | Harness r2 | Harness r1 → r2 | Harness vs baseline, r2 |",
    "|---|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.run} | ${r.label} | ${show(r.b1)} | ${show(r.b2)} | ${show(r.h1)} | ${show(r.h2)} | ${r.delta} | ${r.vsBase} |`),
    "",
    `### Harness measures that got worse from round 1 to round 2 (${worse.length} rows)`,
    "",
    "| Run | Measure | Harness r1 | Harness r2 | Change |",
    "|---|---|---|---|---|",
    ...worse.map((r) => `| ${r.run} | ${r.label} | ${show(r.h1)} | ${show(r.h2)} | ${r.delta} |`),
    "",
    "### What the round-2 safeguards removed (Task 1, harness arm)",
    "",
    "Findings dropped by the harness before review, by reason (`duplicate` and `deprioritized-criterion` are new in round 2), and accepted findings the teacher view flagged as repeating a rejected one (the simulated teacher then rejected them).",
    "",
    "| Run | Dropped by reason | Repeat flags |",
    "|---|---|---|",
    ...notes,
    "",
  ].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = dirname(fileURLToPath(import.meta.url));
  console.log(compareRounds(process.argv[2] ?? here, process.argv[3] ?? join(here, "round2")));
}
