// The Learning Commons Knowledge Graph: open misconception entries (the Eedi Misconceptions Graph,
// CC BY 4.0) and the standards they relate to. The full export is about 1 GB of JSONL, so the
// downloader streams it once and keeps only misconception nodes, their direct relationships and
// the nodes those relationships point to. Gated datasets are never read.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import type { Misconception } from "@teacher-gate/core";
import { dataDir } from "./download";

/** The pinned export version. */
export const LC_KG_VERSION = "v1.16.0";
const BASE = `https://cdn.learningcommons.org/knowledge-graph/${LC_KG_VERSION}/exports`;
const EXTRACT = `lc-kg/${LC_KG_VERSION}/misconceptions.json`;

interface KgNode {
  identifier: string;
  labels: string[];
  properties: Record<string, string>;
}
interface KgRelationship {
  type: string;
  source: string;
  target: string;
  label: string;
}

/** The extract the downloader writes. */
export interface KgMisconceptionExtract {
  version: string;
  attribution: string;
  misconceptions: { id: string; description: string; subject?: string; author?: string; license?: string; related: { relation: string; id: string; labels: string[]; name?: string; code?: string }[] }[];
}

async function* lines(url: string): AsyncGenerator<string> {
  const res = await fetch(url);
  if (!res.ok || res.body === null) throw new Error(`Download failed (HTTP ${res.status}): ${url}`);
  const rl = createInterface({ input: Readable.fromWeb(res.body as never), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim() !== "") yield line;
}

function relEnds(raw: Record<string, unknown>): KgRelationship | undefined {
  const source = raw.source_identifier;
  const target = raw.target_identifier;
  return typeof source === "string" && typeof target === "string" ? { type: "relationship", source, target, label: String(raw.label ?? "") } : undefined;
}

/**
 * Streams the Knowledge Graph export and writes the misconception extract to the data directory.
 * Takes a few minutes and about 1 GB of transfer; run once (`pnpm --filter @teacher-gate/public-goods fetch:kg`).
 */
export async function downloadKgMisconceptions(log: (s: string) => void = () => {}): Promise<string> {
  const misconceptions = new Map<string, KgNode>();
  for await (const line of lines(`${BASE}/nodes.jsonl`)) {
    if (!line.includes('"Misconception"')) continue;
    const node = JSON.parse(line) as KgNode;
    if (node.labels.includes("Misconception")) misconceptions.set(node.identifier, node);
  }
  log(`${misconceptions.size} misconception nodes`);
  const rels: KgRelationship[] = [];
  let sample: string | undefined;
  for await (const line of lines(`${BASE}/relationships.jsonl`)) {
    sample ??= line;
    if (!line.includes('"Misconception"')) continue;
    const r = relEnds(JSON.parse(line) as Record<string, unknown>);
    if (r !== undefined && (misconceptions.has(r.source) || misconceptions.has(r.target))) rels.push(r);
  }
  log(`${rels.length} relationships touch a misconception`);
  if (rels.length === 0 && sample !== undefined) log(`relationship sample: ${sample.slice(0, 300)}`);
  // Second hop: the constructs a misconception hinders, and the standards those constructs align to.
  const constructs = new Set(rels.flatMap((r) => [r.source, r.target]).filter((id) => !misconceptions.has(id)));
  const constructRels: KgRelationship[] = [];
  for await (const line of lines(`${BASE}/relationships.jsonl`)) {
    if (!line.includes("StandardsFrameworkItem")) continue;
    const r = relEnds(JSON.parse(line) as Record<string, unknown>);
    if (r !== undefined && (constructs.has(r.source) || constructs.has(r.target))) constructRels.push(r);
  }
  log(`${constructRels.length} construct-to-standard relationships`);
  const wanted = new Set([...constructs, ...constructRels.flatMap((r) => [r.source, r.target])]);
  const others = new Map<string, KgNode>();
  for await (const line of lines(`${BASE}/nodes.jsonl`)) {
    const id = /"identifier":"([^"]+)"/.exec(line)?.[1];
    if (id !== undefined && wanted.has(id)) others.set(id, JSON.parse(line) as KgNode);
  }
  const standardsOf = (constructId: string) =>
    constructRels.filter((r) => r.source === constructId || r.target === constructId).map((r) => others.get(r.source === constructId ? r.target : r.source)).filter((n): n is KgNode => n !== undefined && n.labels.includes("StandardsFrameworkItem"));
  const extract: KgMisconceptionExtract = {
    version: LC_KG_VERSION,
    attribution: 'Knowledge Graph is provided by Learning Commons under the CC BY-4.0 license. "Eedi Misconceptions Graph v1.0" (c) 2026 Eedi Ltd., licensed under CC BY 4.0.',
    misconceptions: [...misconceptions.values()].map((m) => ({
      id: m.identifier,
      description: m.properties.description ?? m.properties.name ?? "",
      ...(m.properties.academicSubject === undefined ? {} : { subject: m.properties.academicSubject }),
      ...(m.properties.author === undefined ? {} : { author: m.properties.author }),
      ...(m.properties.license === undefined ? {} : { license: m.properties.license }),
      related: rels.filter((r) => r.source === m.identifier || r.target === m.identifier).flatMap((r) => {
        const otherId = r.source === m.identifier ? r.target : r.source;
        const other = others.get(otherId);
        const name = other?.properties.name ?? other?.properties.description;
        return [
          { relation: r.label, id: otherId, labels: other?.labels ?? [], ...(name === undefined ? {} : { name }) },
          ...standardsOf(otherId).map((std) => ({
            relation: `${r.label}>aligns`,
            id: std.identifier,
            labels: std.labels,
            ...(std.properties.description === undefined ? {} : { name: std.properties.description.slice(0, 300) }),
            ...(std.properties.statementCode === undefined ? {} : { code: std.properties.statementCode }),
          })),
        ];
      }),
    })),
  };
  const target = join(dataDir(), EXTRACT);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(extract));
  return target;
}

/** The misconception extract, if it has been downloaded. */
export function readKgExtract(): KgMisconceptionExtract | undefined {
  const path = join(dataDir(), EXTRACT);
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as KgMisconceptionExtract) : undefined;
}

/**
 * Checked 2026-11-07 against v1.16.0: every Eedi misconception "hinders" one or more Eedi
 * constructs, but no construct has a direct relationship to a StandardsFrameworkItem, so entries
 * carry their construct names and no standards codes. Filter by keyword or construct instead.
 *
 * Knowledge Graph misconceptions as Teacher Gate catalog entries, with related standards codes as
 * `standards`. Filter by a predicate on the entry (e.g. a standards prefix or a keyword).
 */
export function kgMisconceptions(extract: KgMisconceptionExtract, filter: (m: Misconception) => boolean = () => true, max = 50): Misconception[] {
  const out: Misconception[] = [];
  for (const m of extract.misconceptions) {
    const standards = [...new Set(m.related.flatMap((r) => (r.code !== undefined ? [r.code] : [])))];
    const entry: Misconception = {
      id: `kg-${m.id}`.slice(0, 128),
      title: m.description.slice(0, 300) || m.id,
      description: [m.description, ...m.related.filter((r) => r.labels.includes("Construct") && r.name !== undefined).map((r) => `Hinders: ${r.name}`)].join(" ").slice(0, 4000),
      ...(standards.length === 0 ? {} : { standards: standards.slice(0, 50) }),
      source: `learning-commons-kg:${LC_KG_VERSION}:${m.author ?? "eedi"}`,
    };
    if (filter(entry)) out.push(entry);
    if (out.length >= max) break;
  }
  return out;
}
