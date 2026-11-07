# Observation guide

> Not yet used. See [README](README.md).

For the observer during a [timed session](session-protocol.md). Note what the participant does
and says, not what you think they feel. Use the participant code, never a name. Write a time
stamp for each note.

## What to watch for

### Reading and evidence

- Do they read the student's work before the findings, after, or not at all?
- Do they click or hover the highlighted evidence? Do they look at the evidence before deciding?
- Do they notice when two findings' evidence overlaps?
- Do they notice the uncertainty label? The suggested level? Do they comment on either?
- Do they notice the count of dropped findings? Do they ask what it means?
- Do they notice the "applied preferences" list?

### Deciding

- How long before the first decision on an item?
- Do they decide in order, or jump around?
- What do they edit: wording, tone, length, accuracy, grade language, something else?
- What do they reject, and what reason do they say aloud?
- Do they change a decision after making it?
- When a finding is flagged for grade or level language, do they understand why release is
  blocked? How do they fix it?

### Releasing

- Do they find the Release button? Do they understand why it is disabled when it is?
- Do they look at the student view afterwards, if offered?
- Do they hesitate before releasing? What do they say?

### The brief

- Do they understand what a mapping is?
- Do they read the quoted response before confirming?
- Do they use reassign? Can they find the right misconception?

### Trust and worry

- Do they say anything about trusting or not trusting the AI?
- Do they mention students, parents or their own workload?
- On the injection item: do they notice the embedded instruction? Does the AI's output appear
  affected? What do they say?
- On dialect or multilingual items: do they comment on how the AI treats the writing?

## Severity of usability problems

| Severity | Meaning |
|---|---|
| 1 Blocks | The participant cannot complete the task without help |
| 2 Slows | The participant completes it but with a clear delay, error or workaround |
| 3 Cosmetic | Noticed or commented on, with no effect on completion |

## Note format

```
[14:22:10] P07 S03 item 2 — Hovered evidence for f2 before deciding. Said "that's not what she
  wrote" then saw the highlight and said "oh it is". Accepted. (evidence-checking)
[14:23:30] P07 S03 item 2 — Release button disabled; looked for 6 s; read blocker text; went back
  to f3. (usability, severity 2)
```

Tag each note with one or more of: `evidence-checking`, `decision`, `edit`, `reject`, `release`,
`usability`, `trust`, `brief`, `injection`, `language`, `software`.

## Do not

- Help the participant, except to recover from a software failure (note it).
- Record student names (there are none in synthetic data; if any appear, stop and tell the
  facilitator).
- Record the participant's name, school or anything that identifies them in the notes.
