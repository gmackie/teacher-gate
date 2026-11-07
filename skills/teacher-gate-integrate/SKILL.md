---
name: teacher-gate-integrate
description: >
  For coding agents integrating Teacher Gate into an edtech product: run the HTTP service (or embed
  @teacher-gate/core), issue product and agent tokens, wire the teacher's review screen and the
  student's feedback view, and connect the MCP server for AI agents. Use when a developer asks to
  "add Teacher Gate", "put AI feedback behind teacher review", "integrate the teacher-gate server"
  or "expose Teacher Gate to our agent". Includes a checklist the integration must pass. Not for
  drafting feedback yourself (see teacher-gate-draft-feedback).
license: "Copyright 2026 Graham Mackie and Teacher Gate contributors · SPDX-License-Identifier: CC-BY-4.0. Complete terms in LICENSE-CC-BY-4.0 and NOTICE."
---

# Integrating Teacher Gate into a product

Teacher Gate sits between a language model and a classroom product. The product keeps its own
users and sign-in; Teacher Gate keeps drafts, the teacher's decisions, releases and an audit log,
and enforces one rule: **only a teacher acting directly in the product decides on or releases AI
output. Agents and services draft and read.**

## Choose a shape

- **HTTP service** (`@teacher-gate/server`, any language): run `teacher-gate-server`; your backend
  calls `/v1/*` with a bearer token. Routes are in
  [references/http-routes.md](references/http-routes.md).
- **Embedded** (TypeScript): construct `new TeacherGate({ model, store })` from
  `@teacher-gate/core` and call it with an `Actor` you build from your session. Never build a
  `teacher`/`direct` actor from anything but a signed-in teacher's session.
- **AI agents**: run `@teacher-gate/mcp` (`teacher-gate-mcp`) with an **agent** token. It exposes
  draft and read tools only.

## Tokens and actors

| Token kind | Who holds it | Acts as |
|---|---|---|
| `product` | your backend only, never a browser or an agent | the `X-Actor-Id` / `X-Actor-Role` it sends (`teacher`, `student`, `service`), channel `direct` |
| `agent` | the MCP server or another AI harness | always role `agent`, channel `agent`, whatever headers it sends |

Configure them with `TEACHER_GATE_TOKENS='{"<product-secret>":"product","<agent-secret>":"agent"}'`.
Your backend must set `X-Actor-Role: teacher` only for a signed-in teacher of that class, and
`student` with `X-Actor-Id` equal to the submission's `learnerRef` for students.

## Wire the flow

1. **Activity**: when a teacher sets up an assignment, `PUT /v1/activities/:id` with the rubric and
   `aiHelp` policy (`none`, `teacher-only`, `releasable`). Default to `teacher-only` unless the
   teacher opts in to releasing.
2. **Draft**: on submission (or on the teacher's request), `POST /v1/drafts` with the submission.
   Use an opaque `learnerRef`, never a name or email.
3. **Teacher review screen**: `GET /v1/drafts/:id` returns the teacher view (findings, quoted
   evidence, uncertainty, `gradeLanguage` flags, `releaseBlockers`). Render each finding with
   accept / edit / reject; post each to `POST /v1/drafts/:id/decisions`. The reference React
   component in `@teacher-gate/react` does this, or build your own.
4. **Release**: a "Release to student" button that calls `POST /v1/drafts/:id/release`, enabled
   only when `releaseBlockers` is empty.
5. **Student view**: render only `GET /v1/submissions/:id/student-view` (with the student's actor).
   Never render a draft, a suggested level or the teacher view to a student. Show the view's AI
   notice beside the feedback.
6. **Briefs** (optional): `POST /v1/briefs`, show mappings for confirmation, post decisions, then
   `POST /v1/briefs/:id/save`.
7. **Audit**: `GET /v1/audit` for staff; records hold IDs only.

## Checklist

- [ ] Product tokens live only on your server; the browser never sees one.
- [ ] Agents (including the MCP server) get an `agent` token, never a product token.
- [ ] `X-Actor-Role: teacher` is set only from a signed-in teacher's session for that class.
- [ ] Students see only the student-view route, and only for their own `learnerRef`.
- [ ] Decide and release buttons exist only in the teacher's own signed-in UI.
- [ ] The release button respects `releaseBlockers`; `teacher-only` activities show no release.
- [ ] `learnerRef` is opaque; no names, emails or IDs that identify a student go to the service.
- [ ] Error responses (`{ error, message }`) are shown to staff, not raw to students.
- [ ] The model provider and keys are your choice (`@teacher-gate/models`), configured server-side.
- [ ] A test proves an agent token gets 403 on `/decisions` and `/release`.
