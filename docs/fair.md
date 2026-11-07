# FAIR

How Teacher Gate's code, data and documentation meet the FAIR principles (Findable, Accessible,
Interoperable, Reusable), with the artefact in this repository for each, and what is still
missing.

## Findable

| Principle | Artefact | Status |
|---|---|---|
| Rich metadata | [`codemeta.json`](../codemeta.json) (CodeMeta 3.0): name, description, version, license, repository, language, requirements, author, keywords | Done |
| Citation metadata | [`CITATION.cff`](../CITATION.cff) | Done |
| Versioned releases | Package versions (`0.1.0` in every `package.json`) | Version set; no tagged release yet |
| **Persistent identifier** | A DOI (for example through Zenodo's GitHub integration) or a Software Heritage identifier | **Missing. Not yet minted** |
| Indexed in a searchable resource | Listing on the Program Platform; Zenodo; Software Heritage archive | **Missing** |
| Data identifiers | Synthetic datasets have stable ids in `meta.id` (`syn-cer-feedback`, and the misconception set's id) | Done in the files; no persistent identifiers |
| Identifiers for third-party sources | Pinned commits, versions and SHA-256 checksums in loaders; homepages in the registry | Done |

## Accessible

| Principle | Artefact | Status |
|---|---|---|
| Retrievable by a standard protocol | Public Git repository over HTTPS | Planned at `https://github.com/gmackie/teacher-gate`; confirm it is public at release |
| Open and free | Code, docs and synthetic data with no account required; open licenses | Done |
| Local operation | Default model is a local open-weight model; no hosted service required | Done |
| Metadata available even if the software is not | Requires an archived copy with a persistent identifier | **Missing** (see Findable) |
| Third-party data access | Loaders download from the publishers' own URLs; the registry records gated or non-commercial goods and does not use them | Done |

## Interoperable

| Principle | Artefact | Status |
|---|---|---|
| Documented formats | Every input is a Zod schema (`packages/core/src/schemas.ts`); the HTTP API is documented in the [integration guide](integration-guide.md); dataset shapes in `packages/public-goods/src/types.ts` | Done |
| Machine-readable API description | An OpenAPI document or exported JSON Schemas | **Missing** |
| Standard vocabularies | BCP 47 language tags; standards identifiers (for example NGSS `MS-PS3-3`) carried as given; Knowledge Graph identifiers for misconceptions; SPDX license ids | Done |
| Plain JSON everywhere | HTTP bodies, records, datasets, evaluation outputs (`config.json`, `records.jsonl`, `summary.json`) | Done |
| Open protocols for agents | Model Context Protocol server; SKILL.md skills | Done |
| Provider-neutral models | `ModelAdapter` interface; OpenAI-compatible, Ollama, vLLM and Anthropic adapters | Done |

## Reusable

| Principle | Artefact | Status |
|---|---|---|
| Clear licenses | Apache-2.0 code, CC-BY-4.0 docs and data ([licensing](licensing.md)); `license` in every `package.json` and skill | Done |
| Provenance | `NOTICE` records adapted code; registry records each public good's license and how it was checked; synthetic data records its author, date and that labels are not teacher-validated | Done |
| Dependency license audit | [licensing](licensing.md) | Done for 0.1.0 |
| Tests | 62 tests across packages; CI on Node 20 and 22 (`.github/workflows/ci.yml`) | Done |
| Examples and tutorials | `apps/demo`, `examples/`, [tutorials](tutorials/) | Done |
| Reproducible evaluation | Seeds, configs and git commit recorded per run; raw model outputs in `records.jsonl` | Mechanism done; results not yet committed under `evals/results/` |
| Community standards | `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY` policy files | **Missing** |
| Changelog | `CHANGELOG.md` | **Missing** |

## Still to do

1. Mint a persistent identifier (DOI) for the first tagged release and add it to `CITATION.cff`
   and `codemeta.json` (`identifier`).
2. Archive the repository in Software Heritage.
3. Publish an OpenAPI description of the HTTP API.
4. Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` and `CHANGELOG.md`.
5. Commit evaluation results with their configs under `evals/results/`.
6. List the release on the Program Platform after the Program's review.

These are also items on the [release checklist](release-checklist.md).
