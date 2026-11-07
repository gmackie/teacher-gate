// Loaders for the synthetic placeholder datasets in data/synthetic (CC BY 4.0, authored for Teacher
// Gate, no real student data). They stand in for Program goods that were not released when this
// was written; see data/synthetic/README.md for how to swap in the real ones.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Activity, Misconception } from "@teacher-gate/core";
import { REPO_ROOT } from "./download";
import type { MisconceptionDataset, ScoredWritingDataset } from "./types";

interface Meta {
  id: string;
  title: string;
  license: string;
  synthetic: true;
  placeholderFor: string;
}

function read<T>(file: string): T {
  return JSON.parse(readFileSync(join(REPO_ROOT, "data", "synthetic", file), "utf8")) as T;
}

/** The synthetic CER feedback set (placeholder for Playlab's CER feedback data). */
export function loadSyntheticCer(): ScoredWritingDataset {
  const raw = read<{ meta: Meta; activity: unknown; items: { id: string; learnerRef: string; text: string; labels: Record<string, string>; tags?: string[]; group?: Record<string, string> }[] }>("cer-feedback.json");
  return {
    id: raw.meta.id,
    title: `${raw.meta.title} (SYNTHETIC placeholder for ${raw.meta.placeholderFor})`,
    license: raw.meta.license,
    synthetic: true,
    labelSource: "The synthetic data's author (not teacher-validated)",
    activity: Activity.parse(raw.activity),
    groupDimensions: ["language"],
    items: raw.items.map((i) => ({ id: i.id, learnerRef: i.learnerRef, text: i.text, labels: i.labels, groups: i.group ?? {}, ...(i.tags === undefined ? {} : { tags: i.tags }) })),
  };
}

/** The synthetic misconception map and class sets (placeholder for Learning Equality's). */
export function loadSyntheticMisconceptions(): MisconceptionDataset {
  const raw = read<{ meta: Meta; catalog: unknown[]; classSets: MisconceptionDataset["classSets"] }>("misconceptions.json");
  return {
    id: raw.meta.id,
    title: `${raw.meta.title} (SYNTHETIC placeholder for ${raw.meta.placeholderFor})`,
    license: raw.meta.license,
    synthetic: true,
    catalog: raw.catalog.map((m) => Misconception.parse(m)),
    classSets: raw.classSets,
  };
}
