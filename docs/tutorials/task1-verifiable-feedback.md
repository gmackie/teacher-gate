# Tutorial 1: verifiable rubric feedback

Task 1 is feedback on one student's work against the teacher's rubric. The model drafts findings.
Code checks every finding's evidence against the work. The teacher accepts, edits or rejects each
one, then releases. The student sees only what the teacher released.

## What the teacher does

1. Sets up the activity: rubric, AI-help policy, optionally which criteria to address and their
   own instructions.
2. Opens a draft for one submission. Each finding shows the criterion, the observation, the
   quoted evidence highlighted in the work, the model's stated uncertainty and, for the teacher
   only, a suggested level.
3. Accepts, edits or rejects every finding. A finding whose text states a score or a level is
   flagged and must be edited before it can be released.
4. Releases. The student sees the accepted findings in the model's words and the edited ones in
   the teacher's words, each with its evidence, and a notice that AI drafted it and the teacher
   reviewed it.

## Setup

Start the service (see [quickstart](../quickstart.md)):

```sh
TEACHER_GATE_INSECURE_DEV=1 pnpm --filter @teacher-gate/server start
```

The curl examples use these shell variables. In insecure dev mode the token is optional; with
tokens, set `TOKEN` to a `product` token.

```sh
BASE=http://localhost:8787/v1
AUTH=(-H "Authorization: Bearer ${TOKEN:-none}")   # drop this in insecure dev mode
TEACHER=(-H "X-Actor-Id: t-104" -H "X-Actor-Role: teacher" -H "Content-Type: application/json")
STUDENT=(-H "X-Actor-Id: syn-L01" -H "X-Actor-Role: student")
```

## The calls, in order

### 1. Put the activity

The synthetic activity in `data/synthetic/cer-feedback.json` has a three-criterion rubric
(claim, evidence, reasoning; levels beginning, developing, proficient).

```sh
python3 -c "import json;print(json.dumps(json.load(open('data/synthetic/cer-feedback.json'))['activity']))" > /tmp/activity.json
curl -s -X PUT "$BASE/activities/syn-cer-ice" "${TEACHER[@]}" --data @/tmp/activity.json
```

Only a teacher acting directly can do this. An agent token or a `service` role gets 403.

### 2. Draft feedback

```sh
curl -s -X POST "$BASE/drafts" "${TEACHER[@]}" -d '{
  "id": "sub-syn-cer-01",
  "activityId": "syn-cer-ice",
  "learnerRef": "syn-L01",
  "artifacts": [{ "id": "work", "text": "My claim is that the ice cube on the metal plate melted faster then the one on the plastic plate. In our trials the ice on metal melted in 3 min 40 sec, 4 min 10 sec, and 4 min 50 sec, so the average was about 4.2 minutes." }]
}'
```

The reply (201) is a `FeedbackDraft`. Note its `id`:

```json
{ "id": "6ec30362-…", "kind": "feedback", "status": "completed", "model": "ollama/qwen2.5:7b",
  "findings": [{ "id": "f1", "source": "ai-suggested", "criterionId": "claim", "observation": "…",
    "excerpts": [{ "artifactId": "work", "start": 0, "end": 99, "quote": "My claim is that…", "anchoring": "located" }],
    "uncertainty": "low" }],
  "dropped": [], "misplacedRanges": 0, "appliedPreferences": [] }
```

### 3. Read the teacher's view

```sh
DRAFT=6ec30362-…
curl -s "$BASE/drafts/$DRAFT" "${TEACHER[@]}"
```

This adds `criterionTitle`, `suggestedLevelLabel`, any `gradeLanguage` flag, `droppedByReason`
and `releaseBlockers`. A student calling it gets 403.

### 4. Decide on each finding

```sh
curl -s -X POST "$BASE/drafts/$DRAFT/decisions" "${TEACHER[@]}" -d '{ "findingId": "f1", "decision": "accept" }'
curl -s -X POST "$BASE/drafts/$DRAFT/decisions" "${TEACHER[@]}" -d '{ "findingId": "f2", "decision": "edit", "text": "Next step: say which average belongs to which plate." }'
curl -s -X POST "$BASE/drafts/$DRAFT/decisions" "${TEACHER[@]}" -d '{ "findingId": "f3", "decision": "reject", "reason": "Not covered yet." }'
```

Each returns 201 with a `DecisionRecord`. Deciding again on the same finding replaces the decision
in force, until release.

### 5. Release

```sh
curl -s -X POST "$BASE/drafts/$DRAFT/release" "${TEACHER[@]}"
```

201 with the `ReleaseRecord`. If anything blocks release you get 409 (or 422 for policy or
moderation) and the reason.

### 6. Read the student view

```sh
curl -s "$BASE/submissions/sub-syn-cer-01/student-view" "${STUDENT[@]}"
```

```json
{ "view": "student", "submissionId": "sub-syn-cer-01",
  "findings": [{ "criterion": "Claim", "text": "…", "evidence": [{ "artifactId": "work", "start": 0, "end": 99, "quote": "…" }] }],
  "notice": "Drafted with AI and reviewed by your teacher." }
```

The rejected finding, the suggested levels, the uncertainty and the model name are not in it.

The same sequence runs end to end in [examples/node-client](../../examples/node-client) and
[examples/python-client](../../examples/python-client).

## What is verified in code

| Check | Where | Test |
|---|---|---|
| Student work is only in the user message, inside a boundary with a fresh 128-bit token; the system prompt holds none of it | `context.ts`, `boundary.ts` | `gate.test.ts` "drafts verified findings, sealing the work in the boundary…" |
| Work containing a fake boundary or instructions does not change the result | `boundary.ts` | `gate.test.ts` "does not let work containing a fake boundary…" |
| `none` policy, empty work and oversized work are skipped without a model call | `context.ts` | `gate.test.ts` "skips under a none policy…" |
| Every quote is exactly in the work; a corrected spelling or paraphrase is dropped | `verify.ts` | `verify.test.ts` "drops a fabricated quote…" |
| One bad quote drops the whole finding | `verify.ts` | `verify.test.ts` |
| Findings with grading fields, unknown or unselected criteria, or unknown levels are dropped | `verify.ts` | `verify.test.ts` |
| Only a teacher on `direct` decides or releases; denials are audited | `gate.ts` | `gate.test.ts`, `server.test.ts` |
| Every finding must be decided before release | `views.ts` `releaseBlockers` | `gate.test.ts` |
| Text stating a grade or level blocks release until edited | `views.ts` `gradeLanguage` | `gate.test.ts` "blocks release of model text that states a level…" |
| Release under `teacher-only` is refused; tightening the policy withdraws released feedback | `gate.ts` | `gate.test.ts` |
| A student sees nothing before release and nothing of another student's | `gate.ts` `studentView` | `gate.test.ts` |
| The student view never shows a rejected finding, a level, uncertainty or the model | `views.ts` | `gate.test.ts`, `findLeaks` |
| Moderation failure releases nothing | `gate.ts` | `gate.test.ts` "fails closed when moderation holds a finding" |

## What is not verified

- Whether a finding is **correct** or **useful**. Code checks that the evidence is real, not that
  the observation about it is right. That is the teacher's review.
- Whether the suggested level is right. It is shown to the teacher only.
- `gradeLanguage` is a set of patterns (numbers with "score", "x/y", percentages, letter grades,
  a level's label next to "level"). It can miss other phrasings.
