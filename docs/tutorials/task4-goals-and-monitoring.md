# Tutorial 4: teacher goals and monitoring

Task 4 turns a teacher's goal into an evaluation. The teacher states a goal in their own words,
for example "Uses measured data from the investigation as evidence for the claim". Teacher Gate
judges student work (or released feedback) against it with a model, shows the teacher a dry run
on past work, then tracks how often the AI's judgement matches the teacher's own and warns when
that agreement drops.

Nothing in Task 4 reaches students. Judgements are shown to staff only.

## What the teacher does

1. Writes a goal for an activity, optionally tied to a rubric criterion.
2. Looks at a dry run on past (ideally de-identified) work: which submissions the AI says meet the
   goal, with quoted evidence, and which it could not judge.
3. Over the following weeks, records their own judgement on some submissions as the AI judges
   them.
4. Reads the monitoring report: agreement and Cohen's kappa per time window, and a drift alert if
   agreement fell.

## Setup

```sh
BASE=http://localhost:8787/v1
TEACHER=(-H "X-Actor-Id: t-104" -H "X-Actor-Role: teacher" -H "Content-Type: application/json")
SERVICE=(-H "X-Actor-Id: nightly-job" -H "X-Actor-Role: service" -H "Content-Type: application/json")
```

The activity must exist (see [Tutorial 1](task1-verifiable-feedback.md)).

## The calls, in order

### 1. Create the goal

```sh
curl -s -X POST "$BASE/goals" "${TEACHER[@]}" -d '{
  "activityId": "syn-cer-ice",
  "statement": "Uses measured data from the investigation as evidence for the claim.",
  "criterionId": "evidence"
}'
```

Teacher only. Returns the `Goal` with its `id`, `target: "work"` and `evaluator: "work-judge"`.
`criterionId`, if given, must be a criterion of the activity's rubric.

To judge the teacher's **released feedback** instead of the work, register a feedback evaluator
on the server (for example a Learning Commons evaluator through `lcGoalEvaluator`; see
[public goods](../public-goods.md)) and send `"target": "feedback", "evaluator": "learning-commons:revision-actionability"`.
The stock server registers only `work-judge`.

### 2. Dry-run it on past work

```sh
GOAL=…
curl -s -X POST "$BASE/goals/$GOAL/dry-run" "${TEACHER[@]}" -d '{
  "submissions": [
    { "id": "past-1", "activityId": "syn-cer-ice", "learnerRef": "syn-L01", "artifacts": [{ "id": "work", "text": "…" }] },
    { "id": "past-2", "activityId": "syn-cer-ice", "learnerRef": "syn-L02", "artifacts": [{ "id": "work", "text": "…" }] }
  ]
}'
```

Staff. At most 200 submissions are judged. Nothing is stored for monitoring.

```json
{ "goalId": "…",
  "results": [
    { "submissionId": "past-1", "learnerRef": "syn-L01", "met": true, "evidence": ["the average was about 4.2 minutes"], "rationale": "…" },
    { "submissionId": "past-2", "learnerRef": "syn-L02", "met": null, "evidence": [] }
  ],
  "met": 1, "notMet": 0, "unverified": 1 }
```

`met: null` means the judgement could not be verified: the reply did not parse, or a quoted piece
of evidence is not in the work.

### 3. Record AI and teacher judgements as work comes in

The AI side (a scheduled job, a service or an agent may do this):

```sh
curl -s -X POST "$BASE/goals/$GOAL/evaluations" "${SERVICE[@]}" -d '{ "id": "sub-2001", "activityId": "syn-cer-ice", "learnerRef": "L-7f3a", "artifacts": [{ "id": "work", "text": "…" }] }'
```

The teacher side (teacher only):

```sh
curl -s -X POST "$BASE/goals/$GOAL/judgements" "${TEACHER[@]}" -d '{ "submissionId": "sub-2001", "met": true }'
```

Each submission keeps one AI observation and one teacher judgement; recording again replaces it.

### 4. Read the report

```sh
curl -s "$BASE/goals/$GOAL/report?windowDays=7&driftThreshold=0.15&minPairs=5" "${TEACHER[@]}"
```

```json
{
  "goal": { "id": "…", "statement": "…" },
  "windows": [
    { "start": "2027-03-01T…", "end": "2027-03-08T…", "pairs": 9, "agreement": 0.89, "kappa": 0.75 },
    { "start": "2027-03-08T…", "end": "2027-03-15T…", "pairs": 7, "agreement": 0.57, "kappa": 0.16 }
  ],
  "overall": { "pairs": 16, "agreement": 0.75, "kappa": 0.48, "start": "…", "end": "…" },
  "drift": { "from": 0.89, "to": 0.57, "delta": -0.32, "alert": "Agreement with your judgement fell from 89% to 57%. Review recent AI judgements before relying on them." },
  "unverifiedAi": 0
}
```

(The numbers above are illustrative, not results.)

- A **pair** is a submission with both a verified AI judgement and a teacher judgement. Windows
  are by the time of the teacher's judgement.
- **Agreement** is the share of pairs where they match. **Kappa** is Cohen's kappa for met / not
  met; it is `null` with fewer than two pairs or no variation.
- **Drift** is reported when agreement in the latest window with at least `minPairs` pairs is
  lower than in the first such window by more than `driftThreshold`.

## What is verified in code

| Check | Where |
|---|---|
| The work goes to the judge inside a random boundary; the goal statement is the teacher's own text | `goals.ts` `workJudge` |
| A judgement is kept only if it parses and every evidence quote is in the work; otherwise `met` is `null` | `workJudge` |
| Unverified judgements are left out of agreement and counted in `unverifiedAi` | `goalReport` |
| Only a teacher on `direct` creates goals and records teacher judgements | `createGoal`, `recordGoalJudgement` |
| The evaluator must exist and must judge the goal's target | `createGoal`, `evaluatorFor` |
| Kappa and drift are computed from stored pairs | `binaryKappa`, `goalReport` |

Tests: `packages/core/test/phase2.test.ts` ("dry-runs a goal with verified evidence, then reports
agreement and drift"; "computes Cohen's kappa for binary judgements").

## What is not verified

- Whether a `met: true` judgement is right. Real quotes can still be judged wrongly. The report
  exists so the teacher can see how often the AI agrees with them.
- Learning Commons evaluators used as goal judges return no evidence quotes, so their judgements
  cannot be checked against the work. Their prompts were validated by Learning Commons with a
  different model and settings than you may use.
- Small windows give unstable agreement and kappa. The defaults ask for at least 5 pairs before a
  window counts toward drift.
