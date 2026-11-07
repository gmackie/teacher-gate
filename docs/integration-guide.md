# Integration guide

This guide is for developers putting Teacher Gate into a product. It covers:

1. [Choosing a shape](#1-choosing-a-shape): HTTP service or embedded library
2. [HTTP API reference](#2-http-api-reference): every route
3. [Embedding the library](#3-embedding-the-library)
4. [The React components](#4-the-react-components)
5. [Storing records with your own Store](#5-storing-records-with-your-own-store)
6. [Plugging in moderation](#6-plugging-in-moderation)
7. [Model adapters and environment variables](#7-model-adapters-and-environment-variables)
8. [Integration checklist](#8-integration-checklist)

The reference below was written by reading `packages/server/src/server.ts`,
`packages/server/src/phase2.ts` and `packages/server/src/main.ts`. If the code and this page
disagree, the code is right; please open an issue.

## 1. Choosing a shape

| Shape | Use when | You get |
|---|---|---|
| HTTP service (`@teacher-gate/server`) | Your backend is not TypeScript, or you want Teacher Gate as a separate process | JSON over HTTP, bearer tokens, all routes below |
| Embedded (`@teacher-gate/core`) | Your backend is TypeScript | Direct calls; you build the `Actor` from your session; you choose the store and moderator |
| MCP server (`@teacher-gate/mcp`) | An AI agent should draft and read | Draft and read tools only; see [MCP and skills](mcp-and-skills.md) |

In every shape your product keeps its own users and sign-in. Teacher Gate never sees a password
or a student's name.

## 2. HTTP API reference

### Running the service

```sh
TEACHER_GATE_TOKENS='{"<product-secret>":"product","<agent-secret>":"agent"}' \
TEACHER_GATE_STORE=/var/lib/teacher-gate/records.json \
  pnpm --filter @teacher-gate/server start
```

| Variable | Meaning | Default |
|---|---|---|
| `PORT` | Port to listen on | `8787` |
| `TEACHER_GATE_TOKENS` | JSON object mapping each bearer token to `"product"` or `"agent"` | `{}` |
| `TEACHER_GATE_INSECURE_DEV` | `1` accepts requests with no `Authorization` header as `product`. Local demos only. | off |
| `TEACHER_GATE_STORE` | Path of a JSON file to persist records to (`JsonFileStore`) | in memory |
| `TEACHER_GATE_CORS_ORIGINS` | Comma-separated browser origins allowed to call the service | none |
| Model variables | See [section 7](#7-model-adapters-and-environment-variables) | Ollama, `qwen2.5:7b` |

The service refuses to start if `TEACHER_GATE_TOKENS` is empty and insecure dev mode is off.

What the stock `main.ts` does **not** configure: a misconception catalog (so `POST /v1/briefs`
must send `misconceptions`, and feedback drafts get no misconception context), a moderator (it
uses `noModeration`), and extra goal evaluators (only the built-in `work-judge`). To set those,
create the server in your own code; see [section 3](#3-embedding-the-library).

### Authentication and actors

Every route under `/v1/` needs `Authorization: Bearer <token>`. `GET /healthz` needs none.

| Token kind | Headers it must send | Acts as |
|---|---|---|
| `product` | `X-Actor-Id` (1–128 characters) and `X-Actor-Role` (`teacher`, `student` or `service`) | that id and role, on channel `direct` |
| `agent` | `X-Actor-Id` optional (default `agent`) | role `agent`, channel `agent`, whatever role header it sends |

Product tokens belong on your server only. Your backend sets `X-Actor-Role: teacher` only for a
signed-in teacher of that class, and `X-Actor-Role: student` with `X-Actor-Id` equal to the
submission's `learnerRef` for a student.

Example headers:

```sh
H_TEACHER=(-H "Authorization: Bearer $PRODUCT_TOKEN" -H "X-Actor-Id: t-104" -H "X-Actor-Role: teacher" -H "Content-Type: application/json")
```

### Responses and errors

- Bodies are JSON in and JSON out. Responses carry `cache-control: no-store`.
- A successful `POST` returns **201**. A successful `GET` or `PUT` returns **200**.
- Errors are `{ "error": "<code>", "message": "<text>" }`:

| Status | `error` | When |
|---|---|---|
| 400 | `validation` | The body failed schema validation, or an id or level does not exist where one is named |
| 400 | `http` | Missing or invalid `X-Actor-Role` / `X-Actor-Id` on a product token, or a body that is not JSON |
| 401 | `http` | Missing or unknown bearer token |
| 403 | `forbidden` | The actor's role or channel may not do this (for example an agent deciding, a student reading a draft) |
| 404 | `not-found` | The activity, draft, finding, brief, goal or variant does not exist |
| 404 | `http` | No such route (including any path outside `/v1/` and `/healthz`) |
| 409 | `conflict` | The action conflicts with state: deciding after release, release blockers, saving a brief with open mappings, a variant before release |
| 413 | `http` | Body over the limit (5 MB by default) |
| 422 | `policy` | The activity's AI-help policy forbids it (release when the policy is not `releasable`) |
| 422 | `moderation` | The moderator held a student-facing text |
| 500 | `internal` | Anything else, including a model call that throws during a variant or goal judgement. The message is always `Internal error.` so it never echoes student text. |

`OPTIONS` requests get 204. For an origin in `TEACHER_GATE_CORS_ORIGINS`, responses carry
`access-control-allow-origin`, and allow the `authorization`, `content-type`, `x-actor-id` and
`x-actor-role` headers and the `GET`, `POST`, `PUT` and `OPTIONS` methods.

Path segments are URL-decoded. Identifiers you choose (activity, submission, artifact, criterion,
level and learner ids) must match `^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$`.

### Route summary

"Teacher" means a product token with `X-Actor-Role: teacher`. "Staff" means any caller whose role
is not `student` (teacher, service or agent).

| Method | Path | Who | Body / query | Returns |
|---|---|---|---|---|
| GET | `/healthz` | anyone, no token | | `{ ok, model }` |
| PUT | `/v1/activities/:id` | teacher | `Activity` (the path id wins) | the activity |
| GET | `/v1/activities/:id` | any token | | the activity |
| GET | `/v1/activities/:id/preferences` | any token | | `Preferences` a new draft would apply |
| PUT | `/v1/activities/:id/preferences/:prefId` | teacher | `{ "enabled": boolean }` | applied preferences |
| POST | `/v1/drafts` | staff | `Submission` | `FeedbackDraft` |
| GET | `/v1/drafts` | staff | `?activityId=&submissionId=` | `FeedbackDraft[]` |
| GET | `/v1/drafts/:id` | staff | | `TeacherDraftView` |
| POST | `/v1/drafts/:id/decisions` | teacher | `DecisionInput` | `DecisionRecord` |
| POST | `/v1/drafts/:id/release` | teacher | none | `ReleaseRecord` |
| GET | `/v1/submissions/:id/student-view` | the student, or staff to preview | `?language=&readingLevel=` | `StudentFeedbackView` |
| POST | `/v1/drafts/:id/variants` | staff | `{ language?, readingLevel? }` | `ReleaseVariant` |
| POST | `/v1/drafts/:id/variants/:variantId/approve` | teacher | none | `ReleaseVariant` |
| POST | `/v1/briefs` | staff | `{ classSet, misconceptions? }` | `BriefDraft` plus `skippedResponses` |
| GET | `/v1/briefs/:id` | staff | | `{ draft, decisions, open, saved? }` |
| POST | `/v1/briefs/:id/decisions` | teacher | `MappingDecisionInput` | `MappingDecision` |
| POST | `/v1/briefs/:id/save` | teacher | none | `SavedBrief` |
| POST | `/v1/goals` | teacher | `NewGoal` | `Goal` |
| POST | `/v1/goals/:id/dry-run` | staff | `{ submissions: Submission[] }` | `DryRun` |
| POST | `/v1/goals/:id/evaluations` | staff | `Submission` | AI observation and judgement |
| POST | `/v1/goals/:id/judgements` | teacher | `{ submissionId, met }` | `GoalObservation` |
| GET | `/v1/goals/:id/report` | staff | `?windowDays=&driftThreshold=&minPairs=` | `GoalReport` |
| GET | `/v1/audit` | staff | | `AuditRecord[]` |

The goal and variant routes come from `phase2Routes()` in `packages/server/src/phase2.ts`. The
stock `main.ts` registers them.

### Activities

#### `PUT /v1/activities/:id`

Creates or replaces an activity. Teacher only.

Body (`Activity`, `packages/core/src/schemas.ts`; unknown fields are rejected):

| Field | Type | Notes |
|---|---|---|
| `id` | id | Replaced by the path id |
| `title` | string, 1–300 | |
| `prompt` | string, ≤ 8000, optional | What students were asked to do |
| `objectives` | string[], ≤ 20, optional | Learning objectives |
| `standards` | string[], ≤ 50, optional | Used to pick matching misconceptions |
| `rubric` | `{ id, title, criteria: [{ id, title, description?, levels: [{ id, label, description?, points? }] }] }` | 1–50 criteria, 1–20 levels each, lowest level first |
| `aiHelp` | `"none"`, `"teacher-only"` or `"releasable"` | See [architecture](architecture.md#policies) |
| `guidance` | object, optional | `criteria` (ids to address), `instructions` (≤ 4000), `readingLevel` (1–12), `language` (BCP 47), `learnFromDecisions` (default true) |

```sh
curl -s -X PUT localhost:8787/v1/activities/ice-plates "${H_TEACHER[@]}" -d '{
  "title": "Which plate melts ice faster?",
  "prompt": "Write a claim-evidence-reasoning paragraph about your ice cube data.",
  "standards": ["MS-PS3-3"],
  "aiHelp": "releasable",
  "rubric": { "id": "cer", "title": "Claim, evidence, reasoning", "criteria": [
    { "id": "claim", "title": "Claim", "levels": [
      { "id": "beginning", "label": "Beginning" }, { "id": "developing", "label": "Developing" }, { "id": "proficient", "label": "Proficient" } ] },
    { "id": "evidence", "title": "Evidence", "levels": [
      { "id": "beginning", "label": "Beginning" }, { "id": "developing", "label": "Developing" }, { "id": "proficient", "label": "Proficient" } ] } ] }
}'
```

#### `GET /v1/activities/:id`

Returns the activity. 404 if missing.

#### `GET /v1/activities/:id/preferences`

Returns the preferences a new draft on this activity would apply:
`{ applied: AppliedPreference[], deprioritized: string[], editExamples: [{ decisionId, criterionId, before, after }] }`.
See [Tutorial 3](tutorials/task3-teacher-guidance.md).

#### `PUT /v1/activities/:id/preferences/:prefId`

Turns one preference on or off. Teacher only. Body `{ "enabled": true }` or
`{ "enabled": false }`. `enabled` is read as a boolean, so a missing or falsy value turns the preference **off**. Returns the
applied preferences afterwards. Preference ids look like `guidance:criteria`,
`guidance:instructions`, `deprioritize:<criterionId>` and `edit:<decisionId>`.

### Feedback drafts (Task 1)

#### `POST /v1/drafts`

Drafts feedback on one submission. Staff only; a student gets 403.

Body (`Submission`):

```json
{
  "id": "sub-1042",
  "activityId": "ice-plates",
  "learnerRef": "L-7f3a",
  "artifacts": [{ "id": "work", "text": "My claim is that the ice cube on the metal plate melted faster..." }]
}
```

`learnerRef` is an opaque id your product chooses. Up to 20 artifacts. The call waits for the
model. It returns 201 with a `FeedbackDraft` whose `status` is one of:

| `status` | Meaning |
|---|---|
| `completed` | The model returned a findings object. `findings` holds the verified ones; `dropped` lists reasons for the rest |
| `skipped` | No model call. `skipReason` is `ai-help-policy`, `no-text` or `input-too-large` |
| `invalid-output` | The model's reply was not a JSON object with a `findings` array |
| `failed` | Every model call attempt threw |

Each finding is
`{ id, source: "ai-suggested", criterionId, observation, suggestedLevelId?, excerpts: [{ artifactId, start, end, quote, anchoring }], uncertainty }`.
`start` and `end` are UTF-16 offsets into the artifact text. `anchoring` is `exact` when the
model's range matched, `located` when the quote was found at another position.

#### `GET /v1/drafts`

Lists drafts. Optional query `activityId` and `submissionId`.

#### `GET /v1/drafts/:id`

The teacher's view (`TeacherDraftView`):

```json
{
  "view": "teacher",
  "draft": { "id": "…", "status": "completed", "model": "ollama/qwen2.5:7b", "dropped": [], "appliedPreferences": [], "context": { "criteria": ["claim", "evidence"], "objectives": 0, "misconceptions": [], "instructionChars": 1890, "workChars": 712 } },
  "findings": [{ "id": "f1", "criterionId": "evidence", "criterionTitle": "Evidence", "observation": "…", "excerpts": [{ "artifactId": "work", "start": 104, "end": 162, "quote": "…", "anchoring": "located" }], "uncertainty": "medium", "suggestedLevelId": "developing", "suggestedLevelLabel": "Developing" }],
  "droppedByReason": { "quote-not-found": 1 },
  "released": false,
  "releaseBlockers": ["Decide on every finding first (f1 open)."],
  "notice": "AI-suggested feedback for you to review. It is not a grade, and no student sees it until you release it."
}
```

A finding also carries `decision` once decided, and `gradeLanguage` (for example `["score"]` or
`["level:developing"]`) when its text states a score or a level.

#### `POST /v1/drafts/:id/decisions`

Records a decision on one finding. Teacher only. The latest decision on a finding is the one in
force. Body (`DecisionInput`), one of:

```json
{ "findingId": "f1", "decision": "accept", "levelId": "developing", "reason": "optional" }
{ "findingId": "f2", "decision": "edit", "text": "Next step: add the average for each plate.", "levelId": "developing" }
{ "findingId": "f3", "decision": "reject", "reason": "We did not cover this yet." }
```

`text` is required for `edit` (1–2000 characters). `levelId`, if given, must be a level of the
finding's criterion; it is teacher-only and never shown to the student. Returns 409 once the draft
is released, 404 for an unknown finding.

#### `POST /v1/drafts/:id/release`

Releases the draft. Teacher only. No body. Returns 201 with a `ReleaseRecord`:

```json
{
  "draftId": "…", "submissionId": "sub-1042", "activityId": "ice-plates", "learnerRef": "L-7f3a",
  "releasedBy": "t-104", "releasedAt": "2026-11-07T18:52:10.598Z",
  "findings": [{ "findingId": "f2", "criterionId": "evidence", "criterionTitle": "Evidence", "text": "Next step: add the average for each plate.", "excerpts": [{ "artifactId": "work", "start": 104, "end": 162, "quote": "…" }] }],
  "variants": []
}
```

Release is idempotent: releasing again returns the existing record. Errors:

- 422 `policy` if the activity's policy is not `releasable` now.
- 409 `conflict` if the draft is not `completed`, a finding is undecided, every finding was
  rejected, or an accepted finding states a grade or level (edit it instead).
- 422 `moderation` if the moderator holds a text; nothing is released.

#### `GET /v1/submissions/:id/student-view`

What the student sees. A student may read only their own (`X-Actor-Id` equal to the
`learnerRef`); staff may preview.

```json
{
  "view": "student",
  "submissionId": "sub-1042",
  "findings": [{ "criterion": "Evidence", "text": "Next step: add the average for each plate.", "evidence": [{ "artifactId": "work", "start": 104, "end": 162, "quote": "…" }] }],
  "notice": "Drafted with AI and reviewed by your teacher."
}
```

Before release the list is empty and there is no `notice`. With `?language=es` or
`?readingLevel=5`, an approved variant matching it replaces the text and the view gains
`variant: { language?, readingLevel?, notice }`. See
[language and reading level](language-and-reading-level.md).

### Language and reading-level variants

#### `POST /v1/drafts/:id/variants`

Staff. Body `{ "language": "es" }`, `{ "readingLevel": 5 }` or both. The draft must be released
(409 otherwise). The model rewrites the released text; if it does not return every finding in
the same order, nothing is saved (409). Returns the `ReleaseVariant`, not yet approved.

#### `POST /v1/drafts/:id/variants/:variantId/approve`

Teacher only. Runs moderation on every rewritten text (422 if held), then marks the variant
approved. Only approved variants reach the student view.

### Misconception briefs (Task 2)

#### `POST /v1/briefs`

Staff. Body:

```json
{
  "classSet": {
    "id": "exit-2026-11-06",
    "item": { "id": "ice-why", "prompt": "Why does an ice cube melt faster on a metal plate?", "standards": ["MS-PS3-3"] },
    "responses": [{ "id": "r1", "learnerRef": "L-7f3a", "text": "Metal is colder so it pulls the cold out of the ice." }]
  },
  "misconceptions": [{ "id": "cold-flows", "title": "Cold flows", "description": "Thinks cold moves into objects.", "standards": ["MS-PS3-3"], "indicators": ["cold goes into"] }]
}
```

Up to 500 responses of up to 20,000 characters. Only catalog entries sharing a standard with the
item are used (all of them if the item names no standard), at most 25. With no matching entries
the call fails with 400. Responses that are empty or over 4,000 characters are left out and
counted in `skippedResponses`. Returns a `BriefDraft` with verified `mappings`
(`{ id, responseId, learnerRef, misconceptionId, quote, start, end, uncertainty }`), `strengths`
and `dropped` reasons.

#### `GET /v1/briefs/:id`

`{ draft, decisions, open: string[], saved? }`. `open` lists mapping ids not yet decided.

#### `POST /v1/briefs/:id/decisions`

Teacher only. Body, one of:

```json
{ "mappingId": "m1", "decision": "confirm" }
{ "mappingId": "m2", "decision": "reject" }
{ "mappingId": "m3", "decision": "reassign", "misconceptionId": "heat-is-substance" }
```

409 once the brief is saved. 400 if `misconceptionId` is not in the brief's catalog.

#### `POST /v1/briefs/:id/save`

Teacher only. 409 while any mapping is open. Returns the `SavedBrief` with grouped `patterns`
(confirmed and reassigned mappings only), `strengths` and a one-page `markdown` rendering.
Idempotent.

### Goals and monitoring (Task 4)

#### `POST /v1/goals`

Teacher only. Body (`NewGoal`):

```json
{ "activityId": "ice-plates", "statement": "Uses measured data from the investigation as evidence for the claim.", "criterionId": "evidence" }
```

Optional `target` (`work`, default, or `feedback`) and `evaluator` (default `work-judge`). The
evaluator must be registered and must judge the stated target, or the call fails with 400.

#### `POST /v1/goals/:id/dry-run`

Staff. Body `{ "submissions": [Submission, …] }` (at most 200 are judged). Returns
`{ goalId, results: [{ submissionId, learnerRef, met, evidence, rationale? }], met, notMet, unverified }`.
Nothing is stored for monitoring.

#### `POST /v1/goals/:id/evaluations`

Staff. Body is one `Submission`. Judges it and stores the AI observation for monitoring.

#### `POST /v1/goals/:id/judgements`

Teacher only. Body `{ "submissionId": "sub-1042", "met": true }`. Stores the teacher's own
judgement. A missing or non-true `met` is stored as `false`.

#### `GET /v1/goals/:id/report`

Staff. Query `windowDays` (default 7), `driftThreshold` (default 0.15), `minPairs` (default 5).
Returns `{ goal, windows, overall, drift?, unverifiedAi }`. See
[Tutorial 4](tutorials/task4-goals-and-monitoring.md).

### Audit

#### `GET /v1/audit`

Staff. Returns every `AuditRecord`:
`{ seq, at, action, actor, outcome: "allowed" | "denied", subject: { …ids }, reason? }`. Records
hold ids only, never student text.

## 3. Embedding the library

For a TypeScript backend, call the core directly:

```ts
import { TeacherGate, type Actor } from "@teacher-gate/core";
import { modelFromEnv } from "@teacher-gate/models";

const gate = new TeacherGate({
  model: modelFromEnv(),        // or new OllamaModel({ model: "qwen2.5:7b" }), etc.
  store: myStore,               // see section 5; default MemoryStore
  moderator: myModerator,       // see section 6; default noModeration
  misconceptions: catalog,      // optional; matched to activities by standard
});

// Build the actor from YOUR signed-in session. Never from request input.
const teacher: Actor = { id: session.userId, role: "teacher", channel: "direct" };

await gate.putActivity(teacher, activity);
const draft = await gate.draftFeedback(teacher, submission);
const view = await gate.getDraft(teacher, draft.id);
await gate.decide(teacher, draft.id, { findingId: "f1", decision: "accept" });
await gate.release(teacher, draft.id);
const studentView = await gate.studentView({ id: learnerRef, role: "student", channel: "direct" }, submission.id);
```

`TeacherGateOptions` (`packages/core/src/gate.ts`):

| Option | Default | Meaning |
|---|---|---|
| `model` | required | A `ModelAdapter` |
| `store` | `new MemoryStore()` | Where records go |
| `moderator` | `noModeration` | Checks student-facing text at release |
| `misconceptions` | `[]` | Catalog for feedback context |
| `limits` | `{ maxWorkChars: 40000, maxMisconceptions: 8 }` | Context limits |
| `rangePolicy` | `"locate"` | `strict` drops excerpts whose range does not match exactly |
| `maxOutputTokens` | 2000 | Per draft |
| `retries` | 1 | Retries after a model call throws |
| `now`, `boundary` | clock, `randomBoundary` | For tests |

Errors are `GateError` with `code` `forbidden`, `not-found`, `conflict`, `policy`,
`validation` or `moderation`.

Tasks 2 and 4 and variants are functions that take the gate: `draftMisconceptionBrief`,
`getBrief`, `decideMapping`, `saveBrief`, `createGoal`, `dryRunGoal`, `evaluateGoal`,
`recordGoalJudgement`, `goalReport`, `draftVariant` and `approveVariant`, all exported from
`@teacher-gate/core`.

### Running the HTTP server with your own options

```ts
import { createServer } from "@teacher-gate/server";

createServer(gate, {
  tokens: new Map([[process.env.PRODUCT_TOKEN!, "product"], [process.env.AGENT_TOKEN!, "agent"]]),
  misconceptions: catalog,          // used by POST /v1/briefs when the body names none
  corsOrigins: [],
  maxBodyBytes: 5 * 1024 * 1024,
  routes: [/* extra Route functions */],
}).listen(8787);
```

`phase2Routes(evaluators)` (goals and variants) lives in `packages/server/src/phase2.ts`. The
package entry point exports only `server.ts` in 0.1.0, so import it from that file
(`main.ts` does) until it is exported. Pass extra goal evaluators, such as
`lcGoalEvaluator(model, evaluator)` from `@teacher-gate/public-goods`, as its argument.

### Testing your integration

`@teacher-gate/core/testing` exports `ScriptedModel`, which returns canned replies and records the
requests it was sent, and `untrustedPayload`, which parses the work back out of a request. The
service's own tests (`packages/server/test/server.test.ts`) show the pattern: start the server on
port 0, run the flow, and assert that an agent token gets 403 on decisions and release.

## 4. The React components

`@teacher-gate/react` has reference components. They render views the service returns and call
back with inputs it accepts. The rules stay in the service, so you may copy and restyle them
freely. They need React 18 or 19.

| Component | Props | Renders |
|---|---|---|
| `TeacherReview` | `view: TeacherDraftView`, `work: Artifact[]`, `onDecide(input: DecisionInput)`, `onRelease()`, `criteria?`, `headingLevel?` | The work with each finding's evidence highlighted; per-finding accept, edit and reject; suggested level and uncertainty; grade-language warnings; applied preferences; dropped counts; Release, disabled while `releaseBlockers` is non-empty |
| `StudentFeedback` | `view: StudentFeedbackView`, `work: Artifact[]`, `headingLevel?` | Released feedback with its evidence and the AI notice; a message when nothing is released |
| `BriefReview` | `brief: { draft, decisions, saved?, open }`, `onDecide(input: MappingDecisionInput)`, `onSave()`, `headingLevel?` | Mappings grouped by misconception with quotes; confirm, reject, reassign; Save once nothing is open |
| `AppliedPreferences`, `WorkView`, `HighlightedText` | see source | Building blocks |

Styles are in `teacherGateStyles`, a CSS string you add to the page. (The package also declares a
`./styles.css` export, but 0.1.0 does not include that file; use `teacherGateStyles`.) Callbacks
return promises; after each one, fetch the view again and pass it back in. `apps/demo/src/App.tsx`
is a complete example.

The components have DOM tests (`packages/react/test/components.dom.test.tsx`), including moving
focus between a finding and its evidence. They have **not** had an accessibility audit.

Show `TeacherReview` and `BriefReview` only in your signed-in teacher UI. Show students only
`StudentFeedback` with a view fetched as that student.

## 5. Storing records with your own Store

The core reads and writes through one small interface (`packages/core/src/store.ts`):

```ts
interface Store {
  get<T>(collection: string, id: string): Promise<T | undefined>;
  put<T>(collection: string, id: string, value: T): Promise<void>;
  list<T>(collection: string, filter?: (value: T) => boolean): Promise<T[]>;
  appendAudit(record: Omit<AuditRecord, "seq">): Promise<number>;
  audit(filter?: (r: AuditRecord) => boolean): Promise<AuditRecord[]>;
}
```

Collections used: `activities`, `drafts`, `decisions`, `releases`, `briefs`, `briefs:decisions`,
`briefs:saved`, `goals`, `goal-runs`, `goal-judgments` and `disabled-preferences` (the `C`
constant has most of them). Values are plain JSON. A document table keyed by
`(collection, id)` with a JSON column, plus an append-only audit table, is enough.

Notes for implementers:

- `list` receives a filter function, not a query. A store backed by a database will load a
  collection and filter in memory, unless you add indexes keyed on the fields the core filters by
  (`activityId`, `draftId`, `submissionId`, `goalId`, `briefId`).
- Return copies, so callers cannot mutate stored records (`MemoryStore` uses `structuredClone`).
- `appendAudit` should be append-only and return a sequence number.
- The core does not use transactions. Two teachers deciding on the same draft at the same moment
  each write a decision; the later `decidedAt` is in force.

`MemoryStore` serves tests and demos. `JsonFileStore` rewrites one JSON file after every write;
it suits a single-process demo, not production.

## 6. Plugging in moderation

Teacher Gate ships no moderation model. You plug in the one your district has approved
(`packages/core/src/moderation.ts`):

```ts
interface Moderator {
  readonly name: string;
  check(text: string, context: { audience: "student" | "family" }): Promise<{ allowed: boolean; categories?: string[] }>;
}
```

Moderation runs on every student-facing text at release and at variant approval. It fails closed:
if `check` throws or returns `allowed: false`, nothing is released, the denial is audited with the
category names (not the text), and the call returns 422 `moderation`. The teacher can then edit or
reject the finding.

`noModeration` (the default) allows everything; its name `none` appears in the release audit so
the choice is visible. `denyListModerator(words)` is a whole-word example, not a real moderator.

## 7. Model adapters and environment variables

`modelFromEnv` (`packages/models/src/env.ts`) picks an adapter:

| Variable | Meaning |
|---|---|
| `TEACHER_GATE_PROVIDER` | `ollama` (default), `anthropic`, `openai` or `vllm` |
| `TEACHER_GATE_MODEL` | The provider's model name. Defaults: Ollama `qwen2.5:7b`, Anthropic `claude-haiku-5-5`, OpenAI `gpt-4o-mini`; required for vLLM |
| `OLLAMA_HOST` | Ollama address, default `http://localhost:11434` |
| `ANTHROPIC_API_KEY` | Anthropic key (otherwise the SDK's own credential lookup) |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL` | OpenAI-compatible key and base URL (default `https://api.openai.com/v1`) |
| `VLLM_BASE_URL`, `VLLM_API_KEY` | vLLM server, default `http://localhost:8000/v1` |

Empty variables count as unset.

| Adapter | Class | Notes |
|---|---|---|
| Ollama | `OllamaModel` | Native `/api/chat`; JSON format; temperature 0; seed 42; 16,384-token context; 10-minute timeout |
| OpenAI-compatible | `OpenAICompatibleModel` | Chat Completions with `fetch`, no SDK; JSON mode; works with OpenAI, vLLM, LM Studio, llama.cpp and others |
| vLLM | `vllmModel(model, baseUrl?, apiKey?)` | An `OpenAICompatibleModel` labelled `vllm/…` |
| Anthropic | `AnthropicModel` | Official SDK; sends no temperature or seed; effort `low` by default; throws `ModelRefusal` on a refusal |

To add another provider, implement `ModelAdapter`:

```ts
import type { ModelAdapter, ModelRequest, ModelResponse } from "@teacher-gate/core";

class MyModel implements ModelAdapter {
  readonly label = "myprovider/my-model";       // shown to teachers and in drafts
  async complete(req: ModelRequest): Promise<ModelResponse> {
    // req.system: instructions, rubric, guidance (never student work)
    // req.user: student work inside the untrusted boundary
    const text = await callMyProvider(req);
    return { text, model: "my-model", usage: { inputTokens: 0, outputTokens: 0 } };
  }
}
```

Throw on failure; the gate retries and then marks the draft `failed`. The output is untrusted:
the gate parses and verifies it.

`MeteredModel(inner, capUsd)` wraps any adapter, estimates spend from `PRICES`, and refuses
requests past the cap. Under a finite cap it refuses any hosted model it has no price for.

## 8. Integration checklist

- [ ] Product tokens live only on your server. The browser never sees one.
- [ ] Agents, including the MCP server, get an `agent` token, never a product token.
- [ ] `X-Actor-Role: teacher` is set only from a signed-in teacher's session for that class.
- [ ] Students see only the student-view route, and only for their own `learnerRef`.
- [ ] Decide, release and approve controls exist only in the teacher's signed-in UI.
- [ ] Release respects `releaseBlockers`. `teacher-only` activities show no release control.
- [ ] `learnerRef` is opaque: no names, emails or ids that identify a student.
- [ ] Error responses are shown to staff, not raw to students.
- [ ] The model provider and keys are configured server-side.
- [ ] A test proves an agent token gets 403 on `/decisions` and `/release`.
- [ ] A real moderator is configured, or the deployment has recorded why not.
- [ ] Records go to a store you back up and can delete from on request.
