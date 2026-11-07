# Tutorial 3: teacher guidance and learning from decisions

Task 3 lets the teacher steer the AI, and lets their past decisions steer it too. Every
preference applied to a draft is listed on the draft, so the teacher can see what is shaping the
model's output and turn any of it off.

## What the teacher does

1. Sets guidance on the activity: which rubric criteria AI feedback should address, written
   instructions, and whether past decisions may steer new drafts.
2. Reviews drafts as in [Tutorial 1](task1-verifiable-feedback.md). Each accept, edit and reject
   is stored.
3. Sees, on each new draft, the preferences that shaped it: for example "You rejected 4 of 5
   suggestions on Claim, so the model comments on it only when the evidence is strong", or "Your
   edit of an earlier suggestion on Evidence is used as a style example".
4. Turns any preference off (or back on), or turns learning off for the activity.

## Where preferences come from

`derivePreferences` (`packages/core/src/preferences.ts`) builds them from the activity and the
decisions on it. It is a pure function: the same inputs always give the same preferences.

| Preference id | Kind | Source | Applies when |
|---|---|---|---|
| `guidance:criteria` | `focus-criteria` | guidance | `guidance.criteria` is set. Only those criteria go to the model, and the verifier drops findings on any other (`unselected-criterion`) |
| `guidance:instructions` | `instructions` | guidance | `guidance.instructions` is set. The text goes into the system prompt |
| `deprioritize:<criterionId>` | `deprioritized-criterion` | past decisions | At least 3 decisions on that criterion and at least 60% rejected. The model is told to comment on it only when the evidence is strong |
| `edit:<decisionId>` | `edit-example` | past decisions | The teacher edited a finding on a selected criterion. Up to the 3 most recent edits go into the prompt as before/after style examples |

Past-decision preferences apply only while `guidance.learnFromDecisions` is not `false`. Only the
latest decision on each finding counts. Preferences are per activity: decisions on one activity
do not steer another.

## Setup

```sh
BASE=http://localhost:8787/v1
TEACHER=(-H "X-Actor-Id: t-104" -H "X-Actor-Role: teacher" -H "Content-Type: application/json")
```

## The calls, in order

### 1. Set guidance on the activity

Add a `guidance` object when you put the activity:

```json
{
  "title": "Which plate melts ice faster?",
  "aiHelp": "releasable",
  "rubric": { "…": "as in Tutorial 1" },
  "guidance": {
    "criteria": ["evidence", "reasoning"],
    "instructions": "Start each comment with a next step. Do not comment on spelling.",
    "learnFromDecisions": true
  }
}
```

```sh
curl -s -X PUT "$BASE/activities/syn-cer-ice" "${TEACHER[@]}" --data @/tmp/activity-with-guidance.json
```

### 2. Draft, review and decide as usual

Follow steps 2 to 4 of [Tutorial 1](task1-verifiable-feedback.md) on several submissions. Edits and
rejections are what the learning loop reads.

### 3. See what the next draft will apply

```sh
curl -s "$BASE/activities/syn-cer-ice/preferences" "${TEACHER[@]}"
```

```json
{
  "applied": [
    { "id": "guidance:criteria", "kind": "focus-criteria", "source": "guidance", "description": "Feedback addresses only: Evidence, Reasoning." },
    { "id": "guidance:instructions", "kind": "instructions", "source": "guidance", "description": "Your written instructions for this activity." },
    { "id": "deprioritize:reasoning", "kind": "deprioritized-criterion", "source": "past-decisions", "description": "You rejected 3 of 4 suggestions on \"Reasoning\", so the model comments on it only when the evidence is strong." },
    { "id": "edit:9d2e…", "kind": "edit-example", "source": "past-decisions", "description": "Your edit of an earlier suggestion on \"Evidence\" is used as a style example." }
  ],
  "deprioritized": ["reasoning"],
  "editExamples": [{ "decisionId": "9d2e…", "criterionId": "evidence", "before": "…", "after": "Next step: …" }]
}
```

Every new draft also carries `appliedPreferences`, and the teacher view shows them
(`AppliedPreferences` in `@teacher-gate/react`).

### 4. Turn a preference off

```sh
curl -s -X PUT "$BASE/activities/syn-cer-ice/preferences/deprioritize:reasoning" "${TEACHER[@]}" -d '{ "enabled": false }'
```

Teacher only. Returns the applied list without it. Send `{ "enabled": true }` to turn it back on.
Turning off `guidance:instructions` keeps the instructions on the activity but stops sending them
to the model.

To stop learning from decisions altogether, put the activity again with
`"learnFromDecisions": false`.

## What is verified in code

| Check | Where | Test |
|---|---|---|
| Guidance and learned preferences are applied to later drafts, and each is listed on the draft | `preferences.ts`, `gate.ts` | `preferences.test.ts` "applies guidance and learned preferences to later drafts and lists each one" |
| Learning off means no learned preferences | `preferences.ts` | `preferences.test.ts` "does not learn when the teacher turns learning off" |
| Findings on criteria the teacher did not select are dropped by the verifier | `verify.ts` | `verify.test.ts` |
| Only a teacher on `direct` changes preferences | `gate.ts` `setPreference` | access rule shared with other teacher actions |

## What is not verified

- That the model follows the instructions, the deprioritisation or the style examples. These go
  into the prompt; the model may ignore them. Only the criteria selection is enforced in code.
- That learning helps. The evaluation suite has a simulation with a rule-based simulated teacher
  (`teacher-gate-eval task3`); it is a simulation, not evidence from teachers. See
  [run on your own data](../run-on-your-own-data.md).
