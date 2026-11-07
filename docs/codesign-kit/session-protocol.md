# Session protocol: 60-minute timed review

> Not yet used. Requires ethics (IRB) and district research approval before any session. See
> [README](README.md).

## Goals

1. Measure how long a teacher takes to review and release AI-drafted feedback on one piece of
   student work, once they are familiar with the screen.
2. Record how often they accept, edit and reject findings, and why.
3. Find usability problems in the review screen (`TeacherReview`) and the brief screen
   (`BriefReview`).
4. Hear whether teachers would stand behind what they released, and what would make it more
   useful.

Not goals: judging the teacher, measuring student learning, or comparing teachers with each
other.

## Roles

| Role | Does |
|---|---|
| Facilitator | Runs the script, gives tasks, prompts think-aloud, keeps time. Does not help with the task except to unblock a software failure |
| Observer / timekeeper | Records start and end times and decisions on the [timing sheet](timing-sheet.md); notes behaviour with the [observation guide](observation-guide.md) |
| Participant | A practising teacher (adult educator) who has given informed consent |

One facilitator can do both roles if the session is screen-recorded with consent, and timing is
taken from the recording and the audit log afterwards.

## Materials

- Laptop with Teacher Gate running (see [README](README.md)), a mouse, and a second screen for the
  observer if possible.
- **Practice item**: one synthetic CER paragraph, pre-drafted.
- **Timed items**: 6 synthetic CER paragraphs from `data/synthetic/cer-feedback.json`, pre-drafted,
  in a fixed or counterbalanced order. Include at least one `injection` item and one `dialect` or
  `multilingual` item. Record the item ids.
- **Brief item**: one synthetic class set from `data/synthetic/misconceptions.json`,
  pre-drafted as a brief.
- The rubric for the activity, printed.
- Signed consent form ([template](consent-template.md)).
- Timing sheet (paper or [CSV](timing-sheet.csv)), observation guide, SUS questionnaire, and the
  perceived-value questions below.
- Optional: screen and audio recording, only if the consent form covers it.

## Script and timing

| Time | Segment | Facilitator says or does |
|---|---|---|
| 0:00–0:05 | Welcome and consent | Confirm consent is signed. "We're testing the software, not you. There are no right answers. You can stop or skip anything at any time. All the student work today is invented." Confirm recording, if any |
| 0:05–0:10 | Context | "A tool drafted feedback on some grade 8 science paragraphs against this rubric. Nothing reaches a student until you release it. Please review each piece as you would if it were going to your own student." Hand over the rubric |
| 0:10–0:15 | Practice item (untimed) | Show the review screen: findings, highlighted evidence, accept, edit, reject, release. Ask them to think aloud. Answer interface questions |
| 0:15–0:40 | Timed items (6) | "Please review and release each one. Keep thinking aloud." Observer starts the clock when the draft is on screen and stops it on release (or when the participant decides not to release). No help except to recover from a software failure; note any |
| 0:40–0:47 | Brief | "Here is a summary of misconceptions the tool found in a class set. Confirm, reject or move each one, then save." Time it the same way |
| 0:47–0:52 | Questionnaires | SUS (10 items) and the perceived-value questions, on paper |
| 0:52–0:59 | Debrief interview | Questions below |
| 0:59–1:00 | Close | Thank them. Explain how to withdraw their data. Note the session end time |

If time runs short, drop timed items from the end rather than the questionnaires.

## Think-aloud prompts

Use only neutral prompts, and only after about 15 seconds of silence:

- "What are you thinking now?"
- "What are you looking at?"
- "Keep talking, please."

After a decision, at most once per item:

- "What made you decide that?"

Do not ask leading questions ("Was that helpful?"), and do not explain the interface during timed
items.

## Debrief interview

1. Which findings were easiest to decide on? Which were hardest? Why?
2. Was there anything you wanted to do that the screen did not let you do?
3. Did you trust the highlighted evidence? Did you check it against the work?
4. Would you release this feedback to your own students? What would have to change?
5. How would this fit into your grading routine, if at all? When in the week would you do it?
6. Did anything surprise or worry you?
7. (If an injection item was shown) Did you notice anything unusual in any student's writing?

## Measures

| Measure | Definition | Source |
|---|---|---|
| **Review minutes per released piece** | For each timed item that was released: release time minus the time the draft appeared, in minutes. Report the median and range over items 2–6 (item 1 as a warm-up check) | Timing sheet; cross-check with audit timestamps |
| Release rate | Items released ÷ items attempted | Timing sheet |
| **Edits / rejects** | Counts of accept, edit and reject per item and in total; edit and reject rates per finding | Timing sheet; audit log (`finding.decide` with `decision`) |
| Reasons | Free-text reasons for edits and rejects, coded afterwards (for example: wrong, vague, tone, not taught yet, grade language) | Think-aloud notes, `reason` fields |
| Evidence checking | Whether the participant was seen to read the highlighted evidence before deciding | Observation guide |
| Brief minutes and decisions | Time to save the brief; confirms, rejects, reassigns | Timing sheet |
| **Usability (SUS)** | System Usability Scale, 10 items, 1–5; scored 0–100 by the standard method | Questionnaire |
| **Perceived value** | Three statements, 1 (strongly disagree) to 5 (strongly agree): (a) "The feedback I released is something I would have been willing to write." (b) "Reviewing AI drafts this way would save me time compared with writing feedback myself." (c) "I would use this with my students." Plus one open question: "What would make it more useful?" | Questionnaire |
| Usability problems | Each problem observed, with severity (blocks task / slows / cosmetic) | Observation guide |
| Software failures | Any model, network or interface failure, with time lost | Observation notes |

Report numbers with the number of participants and items. With small samples, report
distributions, not significance tests.

## After the session

- Save the timing sheet, observation notes and questionnaires under the session id.
- Export `GET /v1/audit` from the session's store. Delete the store file once the export is
  checked, if it holds anything beyond synthetic data.
- Store any recording as the consent form says, and delete it on schedule.
- Never put participant names in the same file as the data.
