# Presenting mappings for the teacher's confirmation

Group by misconception, most mappings first. Every line carries the mapping id the teacher acts on.

```
Draft misconception brief for "<item prompt>" (brief <briefId>) — <n> of <total> responses read.
Each mapping below is a suggestion; please confirm, reject or reassign it.

Cold flows into warm objects (2 suggested)
- m1 · L1: "the cold goes into the ice" · uncertainty low
- m4 · L9: "coldness spreads into it" · uncertainty high  ← check

Metal is colder than plastic at room temperature (1 suggested)
- m2 · L3: "Metal is colder than the plastic." · uncertainty low

Strengths to build on
- L2 names conduction: "Metal conducts heat"

Not covered: 1 response was empty and was left out.
```

## After the teacher decides

`get_brief` returns `open` (mapping ids still undecided). Remind the teacher of those only. Once
`saved` is present, the saved brief's `patterns` contain only confirmed and reassigned mappings;
summarise from it, not from the draft.

## Language

| Use | Avoid |
|---|---|
| "suggested mapping", "shows the idea that…" | "student X has misconception Y" |
| "3 responses suggest…" | "3 students got it wrong" |
| "a reasonable idea to refine" | "confused", "low", "struggling students" |
