# Licensing

## What is licensed how

| Part | License | File |
|---|---|---|
| Code: every package under `packages/`, `apps/demo`, `examples/`, scripts and tests | Apache License 2.0 | [LICENSE](../LICENSE) |
| Documentation (`docs/`, READMEs), agent skills (`skills/`), evaluation definitions and results, the synthetic datasets in `data/synthetic/` | Creative Commons Attribution 4.0 International (CC-BY-4.0) | [LICENSE-CC-BY-4.0](../LICENSE-CC-BY-4.0) |

Copyright 2026 Graham Mackie and Teacher Gate contributors. See [NOTICE](../NOTICE).

Parts of `packages/core` (the untrusted-content boundary, the exact-quote rule and the access
rules) are adapted from EducateOS, which is Apache-2.0. The NOTICE file records this.

When you reuse the documentation, skills or synthetic data, attribute "Teacher Gate
contributors" and link to the license. Code snippets in the documentation may also be used under
Apache-2.0.

## Third-party data

Third-party datasets and prompts are **downloaded at run time, not redistributed**. Loaders fetch
them into `data/downloads/` (or `TEACHER_GATE_DATA_DIR`), which is git-ignored, at pinned
versions with checksums where known. Their own licenses apply:

| Source | License as published | Used for |
|---|---|---|
| ELLIPSE corpus | CC BY 4.0 | Evaluation |
| Learning Commons Evaluators (feedback, ELA writing) | Prompts and settings CC BY 4.0; code MIT (the code is not used) | Evaluation and goal evaluators |
| Learning Commons Knowledge Graph, open datasets | CC BY 4.0 (some CC0); gated datasets are not read | Misconception entries |

Results derived from them must carry their attribution. Datasets with non-commercial or gated
terms (FoundationalASSIST, DrawEduMath, NCTE transcripts) are not used; see
[public goods](public-goods.md).

## Dependency license audit

Run on 2026-11-07 at the repository root with `pnpm licenses list --json` (pnpm 11.17.0), which
lists every installed third-party package, development dependencies included. Workspace packages
are not listed.

### Summary

| License | All packages (247) | Runtime only (`--prod`, 102) |
|---|---|---|
| MIT | 216 | 89 |
| ISC | 14 | 7 |
| Apache-2.0 | 7 | 2 |
| BSD-3-Clause | 4 | 2 |
| BSD-2-Clause | 3 | 1 |
| Unlicense | 1 | 1 |
| MIT-0 | 1 | 0 |
| CC-BY-4.0 | 1 | 0 |

No GPL, LGPL, AGPL, MPL, SSPL or other copyleft or source-available licenses were found. No
package was reported with an unknown license.

Runtime packages under licenses other than MIT:

- Apache-2.0: `@anthropic-ai/sdk`, `@opentelemetry/api` (via the SDK).
- ISC: `inherits`, `isexe`, `once`, `setprototypeof`, `which`, `wrappy`, `zod-to-json-schema`.
- BSD-3-Clause: `fast-uri`, `qs`. BSD-2-Clause: `json-schema-typed`.
- Unlicense: `fast-sha256`.

### Entries that are not MIT, Apache, BSD or ISC

| Package | License | How it gets in | Scope | Note |
|---|---|---|---|---|
| `fast-sha256` 1.3.0 | Unlicense | `@anthropic-ai/sdk` → `standardwebhooks` | Runtime, `@teacher-gate/models` only | A public-domain dedication; no conditions. Absent if you do not install `@teacher-gate/models` |
| `@csstools/color-helpers` 5.1.0 | MIT-0 | jsdom's CSS tooling | Development (DOM tests) | MIT without the attribution condition |
| `caniuse-lite` 1.0.30001823 | CC-BY-4.0 | `browserslist` via Babel, used by `@vitejs/plugin-react` | Development (demo build) | Browser-support data. Not shipped in any package; a demo bundle built with Vite does not include it |

### Reproducing the audit

```sh
pnpm install --frozen-lockfile
pnpm licenses list --json          # everything
pnpm licenses list --json --prod   # runtime only
pnpm why <package>                 # how a package gets in
```

Repeat it on every dependency change and before each release (see the
[release checklist](release-checklist.md)). The audit checks licenses as packages declare them;
it is not a legal review and does not check for vulnerabilities.
