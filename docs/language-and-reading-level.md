# Language and reading-level variants

After a teacher releases feedback, Teacher Gate can produce a version of it in another language,
at a set reading level, or both. A variant is rewritten from the teacher's released words, never
from the model's draft. It reaches the student only after a teacher approves it.

The code is in `packages/core/src/transform.ts`. The HTTP routes come from `phase2Routes()`.

## Why

Some students and families do not read feedback in English. Some students cannot get at dense
written feedback. A variant gives them the same feedback the teacher approved, in a form they can
read, without the teacher writing it twice.

## The flow

1. The teacher releases a draft as in [Tutorial 1](tutorials/task1-verifiable-feedback.md).
2. Staff (the teacher, the product's backend or a service) asks for a variant:

   ```sh
   curl -s -X POST "$BASE/drafts/$DRAFT/variants" "${TEACHER[@]}" -d '{ "language": "es", "readingLevel": 5 }'
   ```

   `language` is a BCP 47 tag (for example `es`, `vi`, `pt-BR`). `readingLevel` is a US grade
   level from 1 to 12. At least one is required. The reply (201) is the variant, not yet approved:

   ```json
   { "id": "v-…", "language": "es", "readingLevel": 5,
     "findings": [{ "findingId": "f2", "text": "Próximo paso: …" }],
     "model": "ollama/qwen2.5:7b", "createdAt": "…" }
   ```

3. The teacher reads it and approves it. Teacher only; moderation runs on every text:

   ```sh
   curl -s -X POST "$BASE/drafts/$DRAFT/variants/$VARIANT/approve" "${TEACHER[@]}"
   ```

4. The student (or the product, for a family view) asks for the variant:

   ```sh
   curl -s "$BASE/submissions/sub-1042/student-view?language=es&readingLevel=5" "${STUDENT[@]}"
   ```

   With a matching approved variant, the view shows its text and adds
   `"variant": { "language": "es", "readingLevel": 5, "notice": "Your teacher's feedback, rewritten by AI for reading level or language and approved by your teacher." }`.
   Without one, the view shows the teacher's original text and no `variant` field. Quoted evidence
   from the student's work is never changed.

## What is enforced in code

| Rule | Where |
|---|---|
| Only released feedback can be rewritten (409 otherwise) | `draftVariant` |
| The model gets only the released finding texts, not the work, the rubric or the draft | `draftVariant` |
| The rewrite must return every finding, with the same ids in the same order, or nothing is saved (409, audited as denied) | `draftVariant` |
| A variant is shown only after a teacher on `direct` approves it | `approveVariant`, `studentFeedbackView` |
| Moderation runs on every rewritten text at approval and fails closed | `approveVariant` |
| Students cannot request variants | `requireStaff` |

Tests: `packages/core/test/phase2.test.ts` ("rewrites only released, teacher-approved text…";
"refuses a rewrite that drops a finding").

## What is not checked

- **Translation quality and meaning.** The prompt tells the model to keep the meaning exactly, add
  nothing and remove nothing. Code checks only the number and order of findings. A teacher who
  does not read the target language cannot check the translation. Plan for a reader of that
  language, or a translation quality check, before using this with families. No translation
  quality review has been done.
- **Reading level.** No readability formula is applied. The level is an instruction to the model.
- **Which variant a student sees.** The product chooses the `language` and `readingLevel` query
  parameters. The activity's `guidance.language` and `guidance.readingLevel` fields are stored but
  the core does not yet create or select variants from them automatically.

## Accessibility

The student view is plain text with quoted evidence, so it works with screen readers and
read-aloud tools in principle. The reference `StudentFeedback` component, including the view of an
approved rewrite, passes automated axe checks in the demo; it has not had a manual accessibility
audit. Rewritten text is marked with its `lang` in the teacher's review so screen readers switch
voice.
