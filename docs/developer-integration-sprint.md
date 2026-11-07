# Developer integration sprints

A guide for paired two-week sprints in which a Teacher Gate maintainer works alongside an edtech
developer's team to put Teacher Gate between a language model and their product. Each sprint ends
with a working integration in the developer's staging environment and a written case study.

> **Status: no sprints have been run.** No developer has integrated Teacher Gate yet. This guide
> is a plan.

## Who and what

| Role | Who | Time |
|---|---|---|
| Developer lead | An engineer on the developer's team who owns the integration | About half-time for two weeks |
| Developer product owner | Someone who can decide what teachers and students see | Kickoff, mid-point and demo, plus questions |
| Teacher Gate pair | A Teacher Gate maintainer | Pairs daily; fixes Teacher Gate bugs found during the sprint |
| Teacher advisor (optional) | A teacher who uses the developer's product | Reviews the review screen in week 2 |

Scope: one task (usually Task 1, verifiable feedback) end to end in the developer's product. Other
tasks are stretch goals.

## Prep checklist (week before)

Developer:

- [ ] Names the developer lead and product owner, and books the kickoff, mid-point and demo.
- [ ] Picks the feature: which activity type, which rubric, which users.
- [ ] Confirms a staging environment where the Teacher Gate service can run (Node 20+), and how
      it will reach a model.
- [ ] Chooses the model: a local open-weight model (Ollama or vLLM) or a hosted provider their
      data agreements allow. Has keys ready if hosted.
- [ ] Confirms what data the sprint may use. **Default: synthetic data only.** Real student data
      only if their agreements with districts allow it, in their own environment, de-identified.
- [ ] Shares how their product identifies teachers, students and classes, and where their backend
      could call an HTTP service.
- [ ] Reads the [quickstart](quickstart.md) and runs `pnpm demo` once.

Teacher Gate pair:

- [ ] Reads the developer's API or architecture notes.
- [ ] Prepares a synthetic dataset in the developer's subject using the
      [dataset shape](run-on-your-own-data.md#the-dataset-format), if the built-in one does not
      fit.
- [ ] Agrees on a shared channel and a shared issue list.
- [ ] Notes the current Teacher Gate version and commit.

## Day-by-day plan

### Week 1: wire it up

| Day | Goal | Done when |
|---|---|---|
| 1 | Kickoff (90 min): walk through the [architecture](architecture.md) and access rules; map the developer's users to actors; agree the success criteria below | A one-page integration plan: actors, routes to call, where the review and student views go |
| 2 | Run the service in staging with tokens (`TEACHER_GATE_TOKENS`, product and agent), the chosen model and a store | `GET /healthz` returns the model; a scripted curl run of [Tutorial 1](tutorials/task1-verifiable-feedback.md) works |
| 3 | Backend: map the developer's rubric to an `Activity`; call `PUT /activities` when a teacher sets up an assignment; choose an opaque `learnerRef` | Activities created from the product |
| 4 | Backend: call `POST /drafts` on submission or teacher request; handle `skipped`, `failed` and `invalid-output` | Drafts created from the product, including a skip under `aiHelp: "none"` |
| 5 | Mid-point check (45 min) with the product owner; decide what the review screen looks like (reference component or their own) | Agreed design for the review screen |

### Week 2: put the teacher in control

| Day | Goal | Done when |
|---|---|---|
| 6 | Teacher review screen: render `GET /drafts/:id`; accept, edit and reject; show evidence, uncertainty, grade-language flags and blockers | A teacher account can decide on every finding |
| 7 | Release and student view: release button respects `releaseBlockers`; students see only `GET /submissions/:id/student-view` with the AI notice | End-to-end flow works in staging |
| 8 | Safety checks: write the tests in the success criteria; run the [integration checklist](integration-guide.md#8-integration-checklist); plug in moderation if they have one | Tests pass in their CI |
| 9 | Optional teacher advisor walkthrough; fix rough edges; stretch goal (brief, guidance or variants) | Notes from the walkthrough, if any |
| 10 | Demo (60 min) to the product owner; retrospective; draft the case study | Demo recorded or written up; case study draft shared |

Daily: 30–60 minutes of pairing, and a short written note of what changed, what is blocked and
which Teacher Gate issues were filed.

## Success criteria

The sprint succeeds when, in the developer's staging environment:

1. A teacher in the developer's product can draft, review (accept, edit, reject) and release
   feedback on a submission, and the student sees only the released text.
2. An automated test shows that an `agent` token (or any non-teacher actor) gets 403 on
   decisions and release.
3. An automated test shows that a student cannot read a draft, or another student's feedback.
4. Product tokens are only on the server; `X-Actor-Role: teacher` is set only from a teacher's
   session; `learnerRef` is opaque.
5. No student text appears in the developer's logs from the integration.
6. Every Teacher Gate bug or gap found is filed as an issue, with the ones that blocked the sprint
   fixed or worked around.
7. A case study draft exists and the developer has approved what it says.

Not success criteria: how good the feedback is, or how teachers rate it. Those need teacher
studies; see the [co-design kit](codesign-kit/README.md).

## Case-study template

Publish only what the developer approves in writing. Do not include student data, or claims about
learning or teacher outcomes that were not measured.

```markdown
# Integrating Teacher Gate into <product>

- Developer: <name, link>
- Dates: <start–end>; Teacher Gate version <x.y.z> (commit <sha>)
- People: <roles, names if they agree>

## The product and the feature
What the product does, who uses it, and which feature now goes through Teacher Gate.

## Integration shape
HTTP service or embedded; language and framework; where the service runs; which model and why;
which store.

## What we built
- Activity setup: ...
- Drafting: when and how drafts are created ...
- Teacher review screen: reference component or custom; screenshots without student data ...
- Release and student view: ...
- Tests added: ...

## Effort
Developer hours by area; lines changed; what took longest and why.

## What got in the way
Teacher Gate gaps and bugs, with issue links and their status. Things in the developer's own
stack that made it harder.

## Decisions and trade-offs
For example: AI-help policy defaults, which errors teachers see, how learnerRef is chosen.

## What is not done
Anything out of scope, and what would come next.

## Quotes
From the developer team, approved by them.

## License
This case study is licensed CC-BY-4.0.
```

## After the sprint

- File every finding as a Teacher Gate issue and link it from the case study.
- Update the [integration guide](integration-guide.md) with anything a developer had to discover
  the hard way.
- Check in once after about a month: is the integration still running, and what changed?
