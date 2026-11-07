# Teacher co-design kit

Materials for running timed review sessions in which teachers use Teacher Gate's review screen on
synthetic or de-identified student work. The sessions are meant to answer two questions the code
cannot:

1. Can a teacher review and release AI-drafted feedback fast enough for it to be practical?
2. Is the released feedback something the teacher would have written, or is willing to stand
   behind?

> **Status: none of this has happened.** No sessions have been run, no teachers have been
> recruited, and no data has been collected. Running sessions with people is not part of this
> repository's work. This kit is a starting point for a research team, and it must go through
> ethics review (an IRB or equivalent) and the partner district's research approval before use.

## Contents

| File | What it is |
|---|---|
| [session-protocol.md](session-protocol.md) | A 60-minute timed session: goals, roles, materials, script, think-aloud prompts and measures |
| [consent-template.md](consent-template.md) | A participant consent template for adult educators, with placeholders |
| [timing-sheet.md](timing-sheet.md) and [timing-sheet.csv](timing-sheet.csv) | How to record per-item timing and decisions, and a blank sheet |
| [observation-guide.md](observation-guide.md) | What observers watch for and how to note it |

## Ground rules

- **No real student data in sessions.** Use the synthetic data in `data/synthetic/` or work that
  has been de-identified under an agreement that permits this use. Participants should not bring
  their own students' work.
- **Participants are adult educators** who volunteer. Their participation, or not, must not affect
  their employment.
- **Collect the least you need.** Session ids and participant codes, not names, in every data
  file.
- **The tool is being tested, not the teacher.** Say so at the start and mean it.

## Setting up the software for a session

On the facilitator's laptop:

```sh
pnpm install
ollama pull qwen2.5:7b
TEACHER_GATE_STORE=./session-<id>.json pnpm demo
```

The demo as shipped has three synthetic paragraphs and one six-response class set
(`apps/demo/src/data.ts`). The [session protocol](session-protocol.md) uses seven paragraphs from
`data/synthetic/cer-feedback.json` and a class set from `data/synthetic/misconceptions.json`, so
before a session a developer must either add those items to the demo's data or build a small
session page from the `@teacher-gate/react` components. Neither exists yet.

Pre-draft the items before the participant arrives so they do not wait on the model (for example
with `POST /v1/drafts` and `POST /v1/briefs` against the same service). After the session, export
the audit log (`GET /v1/audit`) for the timestamps of each decision and release. Audit records
hold ids only.

The demo's browser sets the teacher identity itself. That is acceptable for a session on a
facilitator's laptop with synthetic data. It is not acceptable in a product.

## License

CC-BY-4.0, Teacher Gate contributors. Adapt freely; attribute.
