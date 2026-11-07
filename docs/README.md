# Teacher Gate documentation

These documents describe Teacher Gate 0.1.0 as it is in this repository. They document only what
the code does. Where something is planned but not built, or has not happened, they say so.

Teacher Gate is pre-release. It has not been tested with teachers, no developer has integrated it,
and no manual accessibility audit or external safety review has been done (the demo and the
reference components pass automated axe checks only).

## Start here

- [Quickstart](quickstart.md): run the demo, the service and the example clients.
- [Architecture](architecture.md): the five control points, package dependencies and the access
  rules.
- [Integration guide](integration-guide.md): the HTTP API reference, embedding the library, the
  React components, your own store, moderation, model adapters and environment variables.

## Tutorials

One per teacher–AI coordination task. Each says what the teacher does, lists the API calls in
order with example JSON, and says what the code verifies.

1. [Task 1: verifiable rubric feedback](tutorials/task1-verifiable-feedback.md)
2. [Task 2: class misconception brief](tutorials/task2-misconception-brief.md)
3. [Task 3: teacher guidance and learning from decisions](tutorials/task3-teacher-guidance.md)
4. [Task 4: teacher goals and monitoring](tutorials/task4-goals-and-monitoring.md)

Also: [language and reading-level variants](language-and-reading-level.md).

## Data and evaluation

- [Public goods](public-goods.md): which datasets and tools are integrated, which are synthetic
  placeholders and which are unavailable; how to add a loader and swap a placeholder.
- [Run on your own data](run-on-your-own-data.md): the dataset format, the evaluation CLI and what
  each measure means.
- [White paper](white-paper.md) (draft): design, methods and results, including where the
  harness loses to direct prompting. The full results table is
  [`evals/results/RESULTS.md`](../evals/results/RESULTS.md).

## Agents

- [MCP server and agent skills](mcp-and-skills.md).

## Safety, responsibility and release

- [Security and privacy](security-and-privacy.md): threat model and data minimisation.
- [Responsible AI](responsible-ai.md): human oversight, transparency, fairness reporting limits,
  Targeted Universalism and known limitations.
- [Licensing](licensing.md): code and content licenses, and the dependency license audit.
- [FAIR](fair.md): how the repository meets (and does not yet meet) the FAIR principles.
- [Release checklist](release-checklist.md): what must be done before a public release.

## Working with people

- [Teacher co-design kit](codesign-kit/README.md): a session protocol, consent template, timing
  sheet and observation guide. No sessions have been run.
- [Developer integration sprint guide](developer-integration-sprint.md): a plan for paired
  two-week integration sprints. No sprints have been run.

## License of these documents

The documentation in `docs/` is licensed under the Creative Commons Attribution 4.0 International
license ([CC-BY-4.0](../LICENSE-CC-BY-4.0)). Attribute "Teacher Gate contributors". The code is
licensed under [Apache-2.0](../LICENSE). Code snippets in these documents may also be used under
Apache-2.0.
