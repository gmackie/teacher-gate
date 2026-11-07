# Teacher Gate

Teacher Gate is an open-source harness that edtech developers put between a language model and
their classroom product. It drafts AI formative feedback, checks the model's output in code, and
releases nothing to a student until a teacher has reviewed it.

**Status: pre-release (0.1.0).** Not yet tested with teachers. No developer has integrated it yet.
No accessibility audit or external safety review has been done. See
[docs/release-checklist.md](docs/release-checklist.md) for what remains before a release.

## The five control points

A product calls Teacher Gate instead of calling the model directly. Every request passes through
five steps. The teacher controls the last two.

1. **Context.** Only what the task needs goes to the model: the rubric criteria the teacher
   selected, the activity's objectives, the teacher's instructions and preferences, and
   misconception entries that share a standard with the activity. Student work is wrapped in an
   untrusted-content block with a random boundary token. Work over the size limit is skipped,
   never truncated.
2. **Model.** Any provider through an adapter: Ollama and vLLM for local open-weight models, any
   OpenAI-compatible endpoint, or Anthropic. You bring your own keys.
3. **Verify.** Code, not prompts, checks every finding: valid JSON shape, no grade or score field,
   a criterion the teacher selected, a level that criterion has, and every quoted excerpt found
   exactly in the student's work. A finding that fails any check is dropped whole.
4. **Teacher review.** The teacher sees each finding with its evidence highlighted in the work,
   the model's stated uncertainty and any suggested level (teacher only). They accept, edit or
   reject each one.
5. **Release.** Only a teacher acting directly in the product can release. Release is allowed only
   under a `releasable` AI-help policy, after every finding is decided, and after moderation. The
   student view is built from the release record alone.

**The learning loop.** Every accept, edit and reject is stored. Those decisions steer later drafts
(Task 3: criteria the teacher keeps rejecting are deprioritised; their edits become style
examples). They also feed goal monitoring (Task 4: how often the AI's judgement of a teacher's
goal matches the teacher's own, and whether that agreement drifts).

## Packages

| Package | What it is |
|---|---|
| [`@teacher-gate/core`](packages/core) | The harness: context builder, untrusted boundary, verifier, review and release rules, views, preferences, misconception briefs, goals, language and reading-level variants, stores, moderation interface |
| [`@teacher-gate/models`](packages/models) | Model adapters (Ollama, vLLM, OpenAI-compatible, Anthropic), `modelFromEnv`, prices and a spend meter |
| [`@teacher-gate/server`](packages/server) | A thin HTTP service over the core, so products in any language can call it |
| [`@teacher-gate/react`](packages/react) | Reference React components: `TeacherReview`, `StudentFeedback`, `BriefReview` |
| [`@teacher-gate/mcp`](packages/mcp) | A review-safe MCP server: agents can draft and read, never decide or release |
| [`@teacher-gate/public-goods`](packages/public-goods) | Loaders for education public goods, a registry of their status, and synthetic placeholders |
| [`@teacher-gate/evals`](packages/evals) | The evaluation suite: Teacher Gate against direct prompting on the same data and model |
| [`apps/demo`](apps/demo) | A runnable demo of the whole loop |
| [`examples/`](examples) | Small clients in TypeScript and Python that drive the HTTP service |
| [`skills/`](skills) | Agent skills (SKILL.md) for drafting through the MCP server and for integrating Teacher Gate |

## Quickstart (about 5 minutes)

You need Node 20 or later and pnpm. The default model runs locally and costs nothing.

```sh
pnpm install
ollama pull qwen2.5:7b      # install Ollama first: https://ollama.com
pnpm demo
```

Open <http://localhost:5173>. Draft feedback on a synthetic student paragraph, review each finding,
release, then switch to the student view.

To use Anthropic instead (a paid API):

```sh
ANTHROPIC_API_KEY=sk-ant-... TEACHER_GATE_PROVIDER=anthropic pnpm demo
```

`pnpm demo` runs the service in insecure dev mode (no tokens). Never deploy it that way. See
[docs/quickstart.md](docs/quickstart.md) for the service on its own, the example clients and the
checks (`pnpm typecheck`, `pnpm test`).

## Documentation

| Read | For |
|---|---|
| [docs/quickstart.md](docs/quickstart.md) | Running the demo, the service and the example clients |
| [docs/architecture.md](docs/architecture.md) | The flow, package dependencies and access rules |
| [docs/integration-guide.md](docs/integration-guide.md) | HTTP API reference, embedding the library, React components, stores, moderation, model adapters |
| [docs/tutorials/](docs/tutorials) | One tutorial per task (feedback, misconception brief, teacher guidance, goals) |
| [docs/language-and-reading-level.md](docs/language-and-reading-level.md) | Translated and reading-level variants of released feedback |
| [docs/public-goods.md](docs/public-goods.md) | Which public goods are integrated, which are placeholders, and how to add one |
| [docs/run-on-your-own-data.md](docs/run-on-your-own-data.md) | Running the evaluation suite on your own scored writing |
| [docs/mcp-and-skills.md](docs/mcp-and-skills.md) | The MCP server and agent skills |
| [docs/security-and-privacy.md](docs/security-and-privacy.md) | Threat model, data minimisation and what is not protected |
| [docs/responsible-ai.md](docs/responsible-ai.md) | Human oversight, transparency, fairness reporting and known limits |
| [docs/codesign-kit/](docs/codesign-kit) | Materials for teacher co-design sessions (not yet run) |
| [docs/developer-integration-sprint.md](docs/developer-integration-sprint.md) | Guide for paired two-week integration sprints |
| [docs/licensing.md](docs/licensing.md), [docs/fair.md](docs/fair.md), [docs/release-checklist.md](docs/release-checklist.md) | Licenses and dependency audit, FAIR mapping, release checklist |

## Licenses

- Code: [Apache-2.0](LICENSE).
- Documentation, agent skills, evaluation definitions and results, and the synthetic datasets:
  [CC-BY-4.0](LICENSE-CC-BY-4.0).
- Third-party datasets are downloaded by loaders at run time and are not redistributed here.

See [NOTICE](NOTICE) and [docs/licensing.md](docs/licensing.md). Cite this software with
[CITATION.cff](CITATION.cff).

Parts of `packages/core` are adapted from EducateOS (Apache-2.0).
