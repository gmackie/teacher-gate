// ELLIPSE (Crossley et al., 2023; CC BY 4.0): grade 8–12 English-learner essays with six analytic
// scores (1–5 in half points, the average of two trained raters) and demographic labels. Fetched
// from the authors' GitHub at a pinned commit and checksum; not redistributed here.
//
// The rubric below names the six ELLIPSE dimensions with short descriptions written for Teacher
// Gate; it is not the ELLIPSE rubric text (see ELL_Rubrics.docx in the source repository).
import { readFileSync } from "node:fs";
import type { Activity, Criterion } from "@teacher-gate/core";
import { cachedDownload, csvObjects } from "./download";
import type { ScoredWritingDataset } from "./types";

const COMMIT = "710963bbf1acf23a28e40643d9f937d06f047dd4";
const URL = `https://raw.githubusercontent.com/scrosseye/ELLIPSE-Corpus/${COMMIT}/ELLIPSE_Final_github_train.csv`;
/** SHA-256 of the train CSV as downloaded on 2026-11-07. */
export const ELLIPSE_TRAIN_SHA256 = "782344e99668a3ff508d7410c0eb6e36da70f3b28f81c96e367f1ca04924b06c";

const DIMENSIONS: [id: string, column: string, title: string, description: string][] = [
  ["cohesion", "Cohesion", "Cohesion", "How well ideas connect: transitions, references and paragraph organisation."],
  ["syntax", "Syntax", "Syntax", "Range and control of sentence structures."],
  ["vocabulary", "Vocabulary", "Vocabulary", "Range and precision of word choice."],
  ["phraseology", "Phraseology", "Phraseology", "Use of idiomatic phrases, collocations and multi-word expressions."],
  ["grammar", "Grammar", "Grammar", "Control of grammar: agreement, tense, word forms."],
  ["conventions", "Conventions", "Conventions", "Spelling, capitalisation and punctuation."],
];

const LEVELS = [
  { id: "l1", label: "1 Very limited", points: 1 },
  { id: "l2", label: "2 Limited", points: 2 },
  { id: "l3", label: "3 Developing", points: 3 },
  { id: "l4", label: "4 Proficient", points: 4 },
  { id: "l5", label: "5 Highly proficient", points: 5 },
];

/** The level id nearest a 1–5 score, rounding halves up (e.g. 2.5 → l3). */
export function ellipseLevel(score: number): string {
  return `l${Math.min(5, Math.max(1, Math.floor(score + 0.5)))}`;
}

/** The ELLIPSE activity: an independent essay against the six analytic dimensions. */
export const ELLIPSE_ACTIVITY: Activity = {
  id: "ellipse-independent-essay",
  title: "Independent argumentative essay (ELLIPSE)",
  prompt: "Students wrote an independent essay in response to a prompt (each item's prompt is in its source record).",
  objectives: ["Write a clear, well-organised essay in English with control of sentence structure, vocabulary, phrasing, grammar and conventions."],
  aiHelp: "releasable",
  rubric: {
    id: "ellipse-analytic",
    title: "English language proficiency (six analytic dimensions)",
    criteria: DIMENSIONS.map(([id, , title, description]): Criterion => ({ id, title, description, levels: LEVELS })),
  },
};

/** Loads ELLIPSE train items (downloading on first use). */
export async function loadEllipse(options: { verify?: boolean } = {}): Promise<ScoredWritingDataset> {
  const path = await cachedDownload(URL, "ellipse/ELLIPSE_Final_github_train.csv", options.verify === false ? undefined : ELLIPSE_TRAIN_SHA256);
  const rows = csvObjects(readFileSync(path, "utf8"));
  return {
    id: "ellipse-train",
    title: "ELLIPSE corpus, train split",
    license: "CC BY 4.0",
    synthetic: false,
    labelSource: "Two trained raters per essay, averaged (ELLIPSE final corpus)",
    activity: ELLIPSE_ACTIVITY,
    groupDimensions: ["gender", "grade", "race_ethnicity", "ses"],
    citation: "Crossley, S. A., Tian, Y., Baffour, P., Franklin, A., Kim, Y., Morris, W., Benner, B., Picou, A., & Boser, U. (2023). Measuring second language proficiency using the ELLIPSE Corpus. International Journal of Learner Corpus Research, 9(2), 248–269.",
    items: rows.map((r) => {
      const scores = Object.fromEntries(DIMENSIONS.map(([id, col]) => [id, Number(r[col])]));
      return {
        id: `ellipse-${r.text_id_kaggle}`,
        learnerRef: `ellipse-${r.text_id_kaggle}`,
        text: r.full_text!,
        scores,
        labels: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, ellipseLevel(v)])),
        groups: { gender: r.gender!, grade: r.grade!, race_ethnicity: r.race_ethnicity!, ses: r.SES! },
      };
    }),
  };
}
