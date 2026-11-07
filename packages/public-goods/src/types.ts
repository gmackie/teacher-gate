// The shapes every loader returns, so a developer adds a dataset without learning its native format.
import type { Activity, ClassSet, Misconception } from "@teacher-gate/core";

/** One scored piece of student writing. */
export interface ScoredItem {
  id: string;
  learnerRef: string;
  text: string;
  /** The human level per criterion, as a level id of the dataset's rubric. */
  labels: Record<string, string>;
  /** Raw human scores per criterion, where the source has numbers (e.g. averages of two raters). */
  scores?: Record<string, number>;
  /** Learner-group labels the source provides, e.g. `{ race_ethnicity: "...", ses: "..." }`. */
  groups: Record<string, string>;
  tags?: string[];
}

/** A dataset of scored writing against one rubric (Task 1, evaluation). */
export interface ScoredWritingDataset {
  id: string;
  title: string;
  license: string;
  /** True when the data was authored for Teacher Gate rather than collected from students. */
  synthetic: boolean;
  /** Who produced the labels, e.g. "two trained raters, averaged" or "the synthetic data's author". */
  labelSource: string;
  activity: Activity;
  items: ScoredItem[];
  /** The group dimensions present on items, for fairness breakdowns. Empty when the source has none. */
  groupDimensions: string[];
  citation?: string;
}

/** A class set whose responses carry misconception labels (Task 2 evaluation). */
export interface LabelledClassSet extends ClassSet {
  responses: (ClassSet["responses"][number] & { labels: string[] })[];
}

/** A misconception map and labelled class sets. */
export interface MisconceptionDataset {
  id: string;
  title: string;
  license: string;
  synthetic: boolean;
  catalog: Misconception[];
  classSets: LabelledClassSet[];
}
