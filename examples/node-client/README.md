# Node client

A TypeScript client for the Teacher Gate HTTP service, with no dependencies beyond Node's own
`fetch`. It is about 100 lines: [`index.ts`](index.ts).

## Run

Start the service (see [examples/README.md](../README.md)), then from the repository root:

```sh
pnpm tsx examples/node-client/index.ts              # item syn-cer-01
pnpm tsx examples/node-client/index.ts syn-cer-35   # a prompt-injection item
```

| Variable | Default | Meaning |
|---|---|---|
| `TEACHER_GATE_URL` | `http://localhost:8787` | The service |
| `TEACHER_GATE_TOKEN` | none | A `product` token; omit in insecure dev mode |

## What it does

1. `PUT /v1/activities/syn-cer-ice` with the synthetic activity (as a teacher).
2. `POST /v1/drafts` with one paragraph as a submission. This waits for the model.
3. `GET /v1/drafts/:id`: prints each verified finding with its quoted evidence and what the
   verifier dropped.
4. `POST /v1/drafts/:id/decisions` for every finding: accept, edit, reject in turn. A finding
   flagged for grade or level language is always edited.
5. `GET /v1/drafts/:id` again; if no blockers, `POST /v1/drafts/:id/release`.
6. `GET /v1/submissions/:id/student-view` as the student, and shows that the student gets 403 on
   the draft.

It typechecks with the repository (`pnpm typecheck`).

## Using it in your backend

Copy `call()`. In a real product the actor headers come from your signed-in session, and the
`product` token stays on your server.
