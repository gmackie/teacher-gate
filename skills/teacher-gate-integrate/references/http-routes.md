# Teacher Gate HTTP routes

All routes are under `/v1/` and need `Authorization: Bearer <token>`. `GET /healthz` needs none.
Product tokens also send `X-Actor-Id` and `X-Actor-Role` (`teacher`, `student` or `service`).
Errors are `{ "error": <code>, "message": <text> }`: `validation` 400, `forbidden` 403,
`not-found` 404, `conflict` 409, `policy` / `moderation` 422; `401` for a missing or unknown token.

| Method | Path | Who | Body / query | Returns |
|---|---|---|---|---|
| PUT | `/activities/:id` | teacher, direct | activity (rubric, `aiHelp`, guidance) | activity |
| GET | `/activities/:id` | any token | | activity |
| GET | `/activities/:id/preferences` | any token | | preferences a new draft would apply |
| PUT | `/activities/:id/preferences/:prefId` | teacher, direct | `{ enabled }` | applied preferences |
| POST | `/drafts` | staff or agent | submission | feedback draft |
| GET | `/drafts` | staff or agent | `?activityId=&submissionId=` | drafts |
| GET | `/drafts/:id` | staff or agent | | teacher view |
| POST | `/drafts/:id/decisions` | teacher, direct | `{ findingId, decision: accept\|edit\|reject, text?, levelId?, reason? }` | decision |
| POST | `/drafts/:id/release` | teacher, direct | | release record |
| GET | `/submissions/:id/student-view` | the student, or staff to preview | `?language=&readingLevel=` | student view |
| POST | `/briefs` | staff or agent | `{ classSet, misconceptions? }` | brief draft |
| GET | `/briefs/:id` | staff or agent | | brief, decisions, open ids, saved |
| POST | `/briefs/:id/decisions` | teacher, direct | `{ mappingId, decision: confirm\|reject\|reassign, misconceptionId? }` | decision |
| POST | `/briefs/:id/save` | teacher, direct | | saved brief with Markdown |
| GET | `/audit` | staff | | audit records (IDs only) |

"Teacher, direct" means a product token with `X-Actor-Role: teacher`. An agent token is refused
on every such route with 403, whatever headers it sends.

## Environment for `teacher-gate-server`

- `PORT` (default 8787), `TEACHER_GATE_STORE` (JSON file; default in-memory)
- `TEACHER_GATE_TOKENS`: JSON object of token to `"product"` or `"agent"`
- `TEACHER_GATE_INSECURE_DEV=1`: accept requests without a token as product (local demos only)
- `TEACHER_GATE_CORS_ORIGINS`: comma-separated origins
- model settings: see `modelFromEnv` in `@teacher-gate/models`

## Environment for `teacher-gate-mcp`

- `TEACHER_GATE_URL` (default `http://localhost:8787`)
- `TEACHER_GATE_AGENT_TOKEN` (required; an `agent`-kind token)
- `TEACHER_GATE_AGENT_ID` (optional; recorded in the audit log)
