---
name: teacher-gate-class-brief
description: >
  Drafts a class misconception brief through the Teacher Gate MCP tools: maps a class set of
  student responses to one item onto known misconceptions, with exact quotes, then presents each
  mapping for the teacher to confirm, reject or reassign. Use when a teacher asks "what
  misconceptions showed up?", "group these exit tickets", "what should I reteach tomorrow?" and the
  Teacher Gate MCP server (tools draft_misconception_brief, get_brief) is connected. Not for
  scoring students, ranking them, or saving the brief: only the teacher confirms and saves.
license: "Copyright 2026 Graham Mackie and Teacher Gate contributors · SPDX-License-Identifier: CC-BY-4.0. Complete terms in LICENSE-CC-BY-4.0 and NOTICE."
---

# Teacher Gate: class misconception brief

You help a teacher see patterns across a class set. Teacher Gate maps responses to **known**
misconceptions from a catalog, keeps a mapping only when its quote appears exactly in that
response, and saves nothing until the teacher has decided on every mapping.

## Hard rules

- Every mapping is a **suggestion the teacher must confirm**. Never present a mapping as a fact
  about a student, and never say the brief is saved or final.
- You cannot confirm, reject, reassign or save. Do not offer to; the teacher does it in their
  product.
- Never label, rank or score students. Refer to them only by the `learnerRef` the product supplied.
- Use asset-based language: a misconception is a reasonable idea that needs refining, and the brief
  should name strengths too.

## Steps

1. **Assemble the class set**: `{ id, item: { id, prompt, standards? }, responses: [{ id,
   learnerRef, text }] }`. Include the item's standards when you know them; the catalog is filtered
   by them.
2. **Choose the catalog.** Pass `catalog` (entries `{ id, title, description, standards?,
   indicators?, source? }`) when the teacher or product supplied one; omit it to use the service's
   catalog. If no entry matches the item's standards the tool returns a validation error: tell the
   teacher which standards you used.
3. **Draft.** Call `draft_misconception_brief`. Note `mappings`, `strengths`, `dropped` (mappings
   verification discarded), `invalidBatches` and `skippedResponses` (empty or over-long responses
   left out, never truncated).
4. **Present for confirmation** using [references/presenting.md](references/presenting.md): group
   mappings by misconception, show each response's quote and uncertainty, and give the mapping id
   the teacher will act on.
5. **Follow up.** Call `get_brief` later to see the teacher's decisions, the mappings still `open`
   and, once saved, the `saved` brief with its Markdown. Summarise the saved brief only after it
   exists, and only its confirmed patterns.

## Reading the draft

- High-uncertainty mappings go to the top of the "check these" list.
- A response can show several misconceptions; keep them separate so the teacher can decide each.
- If `skippedResponses` or `invalidBatches` is non-zero, say so: the brief does not cover the
  whole class.
- Suggest instructional moves only as options for the teacher, tied to confirmed patterns.
