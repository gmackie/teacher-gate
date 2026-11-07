# Timing sheet

> Not yet used. See [README](README.md).

Use [timing-sheet.csv](timing-sheet.csv), one row per item per session. Fill it in during the
session (or afterwards from a recording) and cross-check against the audit log export.

## Columns

| Column | What to write | Example |
|---|---|---|
| `session_id` | The session's code. No names | `S03` |
| `participant_code` | The participant's code from the consent log | `P07` |
| `item_order` | Position in the session (0 for the practice item) | `2` |
| `item_type` | `practice`, `feedback` or `brief` | `feedback` |
| `item_id` | The synthetic item or class set id | `syn-cer-35` |
| `draft_id` | Teacher Gate draft or brief id, for matching to the audit log | `6ec3…` |
| `findings_shown` | Number of findings (or mappings) on screen | `3` |
| `start_time` | Local time the draft appeared, `HH:MM:SS` | `14:21:05` |
| `end_time` | Local time of release or save (or of giving up) | `14:24:40` |
| `review_seconds` | `end_time − start_time`, in seconds | `215` |
| `accepts` | Findings accepted (mappings confirmed, for a brief) | `1` |
| `edits` | Findings edited (mappings reassigned, for a brief) | `1` |
| `rejects` | Findings or mappings rejected | `1` |
| `released` | `yes`, `no` (chose not to) or `blocked` (could not; note why) | `yes` |
| `checked_evidence` | `yes`, `partly` or `no`: seen reading the highlighted evidence | `yes` |
| `software_issue` | `none`, or a short description and seconds lost | `none` |
| `notes` | Anything else, briefly; no student or participant names | `Edited tone; rejected reasoning finding as "not taught yet"` |

## Rules

- One clock: use the laptop's clock for both start and end.
- Start when the draft is fully visible, not when the participant starts reading.
- Stop at release or save. If the participant decides not to release, stop when they say so and
  write `released = no`.
- If software fails, keep the clock running, note the seconds lost in `software_issue`, and
  subtract them when analysing.
- Review minutes per released piece = `review_seconds / 60` for rows with `released = yes`.
