// The registry of public goods Teacher Gate knows about, with what was actually available when it
// was last checked. Nothing here is assumed: each entry records how it was verified. Update the
// status, and add a loader, when a good is released.

/**
 * - `integrated`: available and loaded by a loader in this package.
 * - `available-not-integrated`: downloadable, but no loader yet.
 * - `available-with-terms`: needs an account, an application or acceptance of terms; no loader.
 * - `not-released`: announced but not downloadable; a synthetic placeholder may stand in.
 */
export type GoodStatus = "integrated" | "available-not-integrated" | "available-with-terms" | "not-released";

/** One public good. */
export interface PublicGood {
  id: string;
  title: string;
  creator: string;
  status: GoodStatus;
  /** The license of the data or content, as its publisher states it. */
  license: string;
  /** Whether Teacher Gate may redistribute it. When not, it ships a downloader instead. */
  redistribution: "downloader-only" | "not-redistributed" | "not-applicable";
  homepage: string;
  /** What Teacher Gate uses it for. */
  use: string;
  /** The synthetic placeholder standing in for it, if any. */
  placeholder?: string;
  /** How and when the status was checked. */
  checked: string;
}

const CHECKED = "2026-11-07: fetched the project page, GitHub/Hugging Face APIs or file headers";

/** Every public good considered for Teacher Gate. */
export const PUBLIC_GOODS: readonly PublicGood[] = [
  { id: "ellipse", title: "ELLIPSE corpus (English Language Learner Insight, Proficiency and Skills Evaluation)", creator: "Crossley et al. (Vanderbilt, The Learning Agency)", status: "integrated", license: "CC BY 4.0", redistribution: "downloader-only", homepage: "https://github.com/scrosseye/ELLIPSE-Corpus", use: "Task 1 evaluation: grade 8–12 ELL essays with six analytic human scores and gender, grade, race/ethnicity and SES labels (fairness breakdown).", checked: CHECKED },
  { id: "lc-evaluators", title: "Learning Commons Evaluators: Feedback (ELA writing, grades 6–12)", creator: "Learning Commons", status: "integrated", license: "Prompts and settings CC BY 4.0; code MIT", redistribution: "downloader-only", homepage: "https://github.com/learning-commons-org/evaluators", use: "Judges of student-facing feedback quality in the evaluation suite; building blocks for Task 4 goals.", checked: CHECKED },
  { id: "lc-knowledge-graph", title: "Learning Commons Knowledge Graph (open datasets, incl. the Eedi misconceptions graph)", creator: "Learning Commons", status: "integrated", license: "Open datasets CC BY 4.0 (some CC0); gated datasets are not openly licensed and are not used", redistribution: "downloader-only", homepage: "https://github.com/learning-commons-org/knowledge-graph", use: "Misconception entries (math) with standards for Task 2 and context building.", checked: CHECKED },
  { id: "lc-agent-skills", title: "Learning Commons Agent Skills", creator: "Learning Commons and Anthropic", status: "integrated", license: "Apache-2.0", redistribution: "not-applicable", homepage: "https://github.com/learning-commons-org/agent-skills", use: "Format followed by Teacher Gate's own skills (SKILL.md).", checked: CHECKED },
  { id: "asap2", title: "ASAP 2.0 (source-based essays)", creator: "Crossley et al.", status: "available-not-integrated", license: "CC BY 4.0", redistribution: "downloader-only", homepage: "https://github.com/scrosseye/ASAP_2.0", use: "Planned: holistic scores with ELL status for an ELL vs non-ELL fairness comparison.", checked: CHECKED },
  { id: "persuade2", title: "PERSUADE 2.0 corpus", creator: "Crossley et al.", status: "available-not-integrated", license: "CC BY 4.0 per the authors' README (Learning Commons' annotated copy is CC BY-NC-SA 4.0)", redistribution: "downloader-only", homepage: "https://github.com/scrosseye/persuade_corpus_2.0", use: "Planned: argumentative essays with discourse-element ratings and demographic labels.", checked: CHECKED },
  { id: "foundational-assist", title: "FoundationalASSIST", creator: "ASSISTments", status: "available-with-terms", license: "CC BY-NC 4.0; gated on Hugging Face (manual approval, research and educational use)", redistribution: "not-redistributed", homepage: "https://huggingface.co/datasets/ASSISTments/FoundationalASSIST", use: "Not used: math answer logs with no misconception labels or demographics, and gated access.", checked: CHECKED },
  { id: "drawedumath", title: "DrawEduMath", creator: "WPI Heffernan Lab and AI2", status: "available-not-integrated", license: "CC BY-NC 4.0 on Hugging Face; CC BY-NC-SA 4.0 on the Program platform (they conflict)", redistribution: "not-redistributed", homepage: "https://huggingface.co/datasets/Heffernan-WPI-Lab/DrawEduMath", use: "Not used yet: images of handwritten math; Teacher Gate's tasks are text-only for now.", checked: CHECKED },
  { id: "ncte-transcripts", title: "NCTE classroom transcripts", creator: "National Center for Teacher Effectiveness / Demszky", status: "available-with-terms", license: "Data license not stated; access by request form", redistribution: "not-redistributed", homepage: "https://github.com/ddemszky/classroom-transcript-analysis", use: "Not used: classroom discourse, not student writing; access by application.", checked: CHECKED },
  { id: "playlab-cer", title: "Playlab CER science feedback interactions, rubric and de-identification pipeline", creator: "Playlab (Program grantee)", status: "not-released", license: "To be openly licensed (Program requirement)", redistribution: "not-applicable", homepage: "https://k12-ai-infrastructure.org/playlab/", use: "Task 1 data once released.", placeholder: "data/synthetic/cer-feedback.json", checked: CHECKED },
  { id: "learning-equality", title: "Learning Equality science items, rubrics and misconception maps", creator: "Learning Equality (Program grantee)", status: "not-released", license: "To be openly licensed (Program requirement)", redistribution: "not-applicable", homepage: "https://k12-ai-infrastructure.org/learning-equality/", use: "Task 2 misconception maps once released.", placeholder: "data/synthetic/misconceptions.json", checked: CHECKED },
  { id: "national-trail", title: "National Trail writing samples and feedback benchmark", creator: "National Trail (Program grantee)", status: "not-released", license: "To be openly licensed (Program requirement)", redistribution: "not-applicable", homepage: "https://k12-ai-infrastructure.org/nationaltrail/", use: "Task 1 and Task 4 data once released; ELLIPSE stands in for scored writing meanwhile.", checked: CHECKED },
  { id: "pitt-multidraft", title: "University of Pittsburgh multi-draft essays and anonymization tools", creator: "University of Pittsburgh (Program grantee)", status: "not-released", license: "To be openly licensed (Program requirement)", redistribution: "not-applicable", homepage: "https://k12-ai-infrastructure.org/comprehensive-multimodal-writing-and-feedback-dataset/", use: "Task 1 multi-draft data and de-identification once released.", checked: CHECKED },
  { id: "quill-feedback", title: "Quill teacher feedback examples", creator: "Quill.org (Program grantee)", status: "not-released", license: "To be openly licensed (Program requirement)", redistribution: "not-applicable", homepage: "https://k12-ai-infrastructure.org/quill/", use: "Task 3 style reference once released. Quill's coaching rubric already underlies the Learning Commons feedback evaluators used here.", checked: CHECKED },
  { id: "kb-tutorbench", title: "Stanford KB-TutorBench", creator: "Stanford University (Program grantee)", status: "not-released", license: "To be openly licensed (Program requirement)", redistribution: "not-applicable", homepage: "https://k12-ai-infrastructure.org/stanford-university/", use: "Task 2 and 4 comparisons once released.", checked: CHECKED },
];
