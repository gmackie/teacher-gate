// Runs Task 1 over a dataset for one model, both arms, and writes the run directory:
// config.json, records.jsonl (raw model outputs included), summary.json and report.md.
// Spend on hosted models is metered against a ledger shared by every run, under a hard cap.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ModelAdapter } from "@teacher-gate/core";
import { MeteredModel, modelFromEnv } from "@teacher-gate/models";
import type { LcFeedbackEvaluatorId, ScoredItem, ScoredWritingDataset } from "@teacher-gate/public-goods";
import { fairness, fmt, fmtCi, summarise, type ArmSummary, type GroupRow } from "./metrics";
import { loadJudges, runBaselineItem, runHarnessItem, type Task1Record } from "./task1";

/** A model named `provider:model`, e.g. `ollama:qwen2.5:7b` or `anthropic:claude-haiku-5-5`. */
export function modelFromSpec(spec: string): ModelAdapter {
  const i = spec.indexOf(":");
  if (i < 0) throw new Error(`Name a model as provider:model, not ${spec}.`);
  return modelFromEnv(process.env, { provider: spec.slice(0, i), model: spec.slice(i + 1) });
}

/** The spend ledger shared by every run in a results directory. */
export interface Ledger {
  capUsd: number;
  totalUsd: number;
  runs: { run: string; at: string; models: Record<string, number> }[];
}

export function readLedger(path: string, capUsd: number): Ledger {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Ledger) : { capUsd, totalUsd: 0, runs: [] };
}

async function pool<T, R>(items: readonly T[], concurrency: number, fn: (t: T, i: number) => Promise<R>, progress?: (done: number) => void): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  let done = 0;
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
      progress?.(++done);
    }
  }));
  return out;
}

/** The repository commit the run used, and whether the tree had uncommitted changes. */
function gitCommit(): string {
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--porcelain", "--", "packages"], { encoding: "utf8" }).trim() !== "";
    return dirty ? `${sha}+uncommitted` : sha;
  } catch {
    return "unknown";
  }
}

/** What one run takes. */
export interface Task1RunOptions {
  run: string;
  resultsDir: string;
  dataset: ScoredWritingDataset;
  items: ScoredItem[];
  sampling: string;
  modelSpec: string;
  judgeSpec?: string;
  evaluators?: LcFeedbackEvaluatorId[];
  concurrency?: number;
  /** The cap on total hosted spend across all runs sharing the ledger. */
  ledgerCapUsd: number;
  log?: (s: string) => void;
}

/** Runs both arms and writes the results. */
export async function runTask1(o: Task1RunOptions): Promise<{ harness: ArmSummary; baseline: ArmSummary; fairness: GroupRow[]; spentUsd: number }> {
  const log = o.log ?? (() => {});
  const ledgerPath = join(o.resultsDir, "spend-ledger.json");
  const ledger = readLedger(ledgerPath, o.ledgerCapUsd);
  const remaining = o.ledgerCapUsd - ledger.totalUsd;
  if (remaining <= 0) throw new Error(`The spend cap of $${o.ledgerCapUsd} is reached ($${ledger.totalUsd.toFixed(4)} spent).`);
  // One meter for the model and one for the judge, sharing the remaining budget.
  const model = new MeteredModel(modelFromSpec(o.modelSpec), remaining);
  const judge = o.judgeSpec === undefined ? undefined : new MeteredModel(modelFromSpec(o.judgeSpec), remaining);
  const evaluators = o.judgeSpec === undefined ? [] : await loadJudges(o.evaluators ?? []);
  const dir = join(o.resultsDir, o.run);
  mkdirSync(dir, { recursive: true });
  const config = {
    run: o.run,
    startedAt: new Date().toISOString(),
    gitCommit: gitCommit(),
    dataset: { id: o.dataset.id, title: o.dataset.title, license: o.dataset.license, synthetic: o.dataset.synthetic, labelSource: o.dataset.labelSource },
    sampling: o.sampling,
    n: o.items.length,
    itemIds: o.items.map((i) => i.id),
    model: model.label,
    judge: judge?.label ?? null,
    evaluators: evaluators.map((e) => ({ id: e.id, stableId: e.stableId })),
    settings: { temperature: "0 where the provider accepts it (Anthropic models take no sampling parameters)", ollamaSeed: 42, maxOutputTokens: 2000, rangePolicy: "locate", simulatedTeacher: "reject if suggested level is 2+ levels from the human label; edit out sentences stating a grade or level; else accept; then reject any accepted finding the teacher view flags as repeating a rejected one" },
  };
  writeFileSync(join(dir, "config.json"), JSON.stringify(config, null, 2));
  const opts = { activity: o.dataset.activity, model, ...(judge === undefined ? {} : { judge, evaluators }) };
  const records: Task1Record[] = [];
  const total = o.items.length * 2;
  const progress = () => {
    if (records.length % 10 === 0) log(`${o.run}: ${records.length}/${total} ($${(model.spentUsd + (judge?.spentUsd ?? 0)).toFixed(4)})`);
  };
  const safe = async (arm: "harness" | "baseline", item: ScoredItem): Promise<Task1Record> => {
    try {
      return arm === "harness" ? await runHarnessItem(opts, item) : await runBaselineItem(opts, item);
    } catch (e) {
      return { itemId: item.id, arm, model: model.label, groups: item.groups, tags: item.tags ?? [], ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "error", parsed: false, findingsTotal: 0, schemaValid: 0, findingsWithInexactQuote: 0, findingsWithFabricatedQuote: 0, quotes: { exact: 0, nearMiss: 0, notFound: 0 }, surfaced: 0, surfacedWithInexactQuote: 0, suggestions: {}, studentFacing: [], leaks: [] };
    }
  };
  const jobs = o.items.flatMap((item) => [["harness", item], ["baseline", item]] as const);
  await pool(jobs, o.concurrency ?? 1, async ([arm, item]) => {
    const r = await safe(arm, item);
    records.push(r);
    progress();
    return r;
  });
  writeFileSync(join(dir, "records.jsonl"), records.sort((a, b) => a.itemId.localeCompare(b.itemId) || a.arm.localeCompare(b.arm)).map((r) => JSON.stringify(r)).join("\n") + "\n");
  const harness = summarise(o.dataset.activity, o.items, records.filter((r) => r.arm === "harness"));
  const baseline = summarise(o.dataset.activity, o.items, records.filter((r) => r.arm === "baseline"));
  const fair = fairness(o.dataset.activity, o.items, records, o.dataset.groupDimensions);
  const spentUsd = model.spentUsd + (judge?.spentUsd ?? 0);
  const fresh = readLedger(ledgerPath, o.ledgerCapUsd);
  fresh.totalUsd += spentUsd;
  fresh.runs.push({ run: o.run, at: new Date().toISOString(), models: { [model.label]: model.spentUsd, ...(judge === undefined ? {} : { [`judge:${judge.label}`]: judge.spentUsd }) } });
  writeFileSync(ledgerPath, JSON.stringify(fresh, null, 2));
  const summary = { config, harness, baseline, fairness: fair, spentUsd, finishedAt: new Date().toISOString() };
  writeFileSync(join(dir, "summary.json"), JSON.stringify(summary, null, 2));
  writeFileSync(join(dir, "report.md"), report(summary));
  return { harness, baseline, fairness: fair, spentUsd };
}

/** A Markdown report of one run. */
export function report(s: { config: { run: string; dataset: { title: string; synthetic: boolean; license: string; labelSource: string }; sampling: string; n: number; model: string; judge: string | null }; harness: ArmSummary; baseline: ArmSummary; fairness: GroupRow[]; spentUsd: number }): string {
  const { harness: h, baseline: b } = s;
  const row = (name: string, hv: string, bv: string) => `| ${name} | ${hv} | ${bv} |`;
  const lines = [
    `# Task 1 evaluation: ${s.config.run}`,
    "",
    `- Dataset: ${s.config.dataset.title} (${s.config.dataset.license})${s.config.dataset.synthetic ? " — **SYNTHETIC data**" : ""}`,
    `- Labels: ${s.config.dataset.labelSource}`,
    `- Sample: ${s.config.sampling}; n = ${s.config.n} items`,
    `- Model: ${s.config.model}; judge: ${s.config.judge ?? "none"}`,
    `- Estimated spend: $${s.spentUsd.toFixed(4)}`,
    "",
    "Harness: Teacher Gate (boundary, verification, simulated teacher review, release). Baseline: direct prompting, same model and data, output shown to the student as returned.",
    "",
    "| Measure | Harness | Direct prompting |",
    "|---|---|---|",
    row("Call failures", String(h.callFailures), String(b.callFailures)),
    row("Output parsed (JSON with findings)", fmt(h.outputParsed), fmt(b.outputParsed)),
    row("Findings schema-valid", fmt(h.findingSchemaValid), fmt(b.findingSchemaValid)),
    row("Findings with inexact evidence, as returned by the model", fmtCi(h.inexactEvidenceRaw), fmtCi(b.inexactEvidenceRaw)),
    row("Findings with fabricated evidence (not in work even normalised), as returned", fmtCi(h.fabricatedEvidenceRaw), fmtCi(b.fabricatedEvidenceRaw)),
    row("**Inexact evidence reaching a person** (teacher / student)", fmtCi(h.inexactEvidenceSurfaced), fmtCi(b.inexactEvidenceSurfaced)),
    row("Findings surfaced per item", h.findingsSurfacedPerItem.toFixed(2), b.findingsSurfacedPerItem.toFixed(2)),
    row("Suggested level = human label (exact)", fmtCi(h.agreement.exact), fmtCi(b.agreement.exact)),
    row("Suggested level within one of human label", fmtCi(h.agreement.withinOne), fmtCi(b.agreement.withinOne)),
    row("Quadratic weighted kappa", h.agreement.qwk?.toFixed(3) ?? "n/a", b.agreement.qwk?.toFixed(3) ?? "n/a"),
    row("Criterion coverage (item×criterion with a suggestion)", fmt(h.agreement.coverage), fmt(b.agreement.coverage)),
    row("**Items leaking grades/levels/rejected findings to the student**", fmtCi(h.leakage.itemsLeaking), fmtCi(b.leakage.itemsLeaking)),
    row("Items with any student-facing feedback", String(h.leakage.itemsWithStudentFacing), String(b.leakage.itemsWithStudentFacing)),
    row("Structured levels a product might display", "0 (never in the student view)", String(b.structuredLevels ?? 0)),
    ...(h.injection === undefined ? [] : [row("Injection items with an inflated top-level suggestion", fmt(h.injection.inflated), fmt(b.injection!.inflated))]),
    ...Object.keys(h.lcPass ?? b.lcPass ?? {}).map((id) => row(`Learning Commons \`${id}\` pass rate (student-facing feedback)`, h.lcPass?.[id] ? fmtCi(h.lcPass[id]) : "n/a", b.lcPass?.[id] ? fmtCi(b.lcPass[id]) : "n/a")),
    row("Tokens in / out", `${h.tokens.input} / ${h.tokens.output}`, `${b.tokens.input} / ${b.tokens.output}`),
    "",
    h.simulatedDecisions === undefined ? "" : `Simulated teacher (driven by the human labels, not a real teacher): accepted ${h.simulatedDecisions.accept}, edited ${h.simulatedDecisions.edit}, rejected ${h.simulatedDecisions.reject}; accepted unedited ${fmt(h.simulatedDecisions.acceptedUnedited)}.`,
    h.harnessDrops === undefined ? "" : `Findings the harness dropped, by reason: ${Object.entries(h.harnessDrops.byReason).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}. Accepted findings flagged as repeating a rejected one (then rejected): ${h.harnessDrops.repeatFlags}.`,
    "",
    "Notes: the harness drops findings whose evidence is not exactly in the work, so its surfaced rate is zero by construction; the raw rates show what the model produced under each prompt. Agreement compares a model's suggested level (teacher-only in the harness) with the human label. Leakage for the baseline counts grade or level language in the observations it would show the student; its structured `suggestedLevel` is counted separately.",
    "",
  ];
  if (s.fairness.length > 0) {
    lines.push("## Breakdown by learner group", "", "| Dimension | Group | Arm | Items | Inexact evidence (raw) | Inexact reaching a person | Exact agreement | Within one | Leaking |", "|---|---|---|---|---|---|---|---|---|");
    for (const r of s.fairness) lines.push(`| ${r.dimension} | ${r.value} | ${r.arm} | ${r.items} | ${fmt(r.inexactEvidenceRaw)} | ${fmt(r.inexactEvidenceSurfaced)} | ${fmt(r.exactAgreement)} | ${fmt(r.withinOne)} | ${fmt(r.leaking)} |`);
    lines.push("", "Small groups have wide intervals; differences here are descriptive, not significance-tested.", "");
  } else {
    lines.push("## Breakdown by learner group", "", "This dataset has no learner-group labels, so no fairness breakdown is possible.", "");
  }
  return lines.join("\n");
}
