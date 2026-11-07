# Release checklist

Before a public release, and before submitting a release for the K-12 AI Infrastructure Program's
safety review and publication on the DrivenData-hosted Program Platform. Every box is unchecked:
none of this has been done for a release yet.

Copy this list into the release's tracking issue and check items there, each with a link to the
evidence. "Who" names a role; assign a person per release.

## 1. Licenses

- [ ] Every `package.json` declares `"license": "Apache-2.0"`. *Who: maintainer. How:* `grep -L '"license": "Apache-2.0"' packages/*/package.json apps/*/package.json` prints nothing.
- [ ] `LICENSE`, `LICENSE-CC-BY-4.0` and `NOTICE` are present and current. *Who: maintainer.*
- [ ] Every skill's frontmatter names CC-BY-4.0. *Who: maintainer. How:* `pnpm test` (skills test).
- [ ] Docs and synthetic data state CC-BY-4.0. *Who: maintainer.*
- [ ] Adapted third-party code is attributed in `NOTICE`. *Who: maintainer.*

## 2. Dependency audit

- [ ] `pnpm licenses list --json` and `--prod` re-run; [licensing](licensing.md) updated; any
      license other than MIT, Apache-2.0, BSD, ISC, MIT-0 or Unlicense reviewed and recorded.
      *Who: maintainer.*
- [ ] `pnpm audit` run; every high or critical advisory fixed or recorded with a reason.
      *Who: maintainer.*
- [ ] `pnpm install --frozen-lockfile` succeeds from a clean checkout. *Who: CI.*

## 3. No student data

- [ ] No real student work, names or identifiers in the repository or its history.
      *Who: maintainer and a second reviewer. How:* review `data/`, `apps/demo/src/data.ts`, test
      fixtures, docs and examples; search history for data files (`git log --all --stat -- '*.csv' '*.json' '*.jsonl'`).
- [ ] `data/downloads/` and any third-party data are git-ignored and absent from history.
      *Who: maintainer.*
- [ ] Committed evaluation outputs contain only synthetic data or data whose license permits
      redistribution, with attribution. *Who: maintainer.*

## 4. Synthetic data and labels

- [ ] Every synthetic dataset has `synthetic: true`, an author, a date and a CC-BY-4.0 license in
      its metadata. *Who: maintainer.*
- [ ] Docs and reports state that synthetic labels are the author's and not teacher-validated.
      *Who: maintainer.*
- [ ] The public-goods registry is re-checked and its `checked` dates updated; placeholders are
      swapped for released goods where possible. *Who: maintainer.*

## 5. Evaluation reproducibility

- [ ] Every reported result has a run folder under `evals/results/<run>/` with `config.json`,
      `records.jsonl` (raw model outputs), `summary.json` and `report.md`. *Who: evaluation lead.*
- [ ] Each `config.json` records a clean git commit (no `+uncommitted`). *Who: evaluation lead.*
- [ ] Exact commands, seeds, model labels and dataset versions for every run are listed in the
      white paper. *Who: evaluation lead.*
- [ ] A second person re-runs one local-model run from the instructions and gets the same
      numbers. *Who: second reviewer.*
- [ ] `spend-ledger.json` committed; hosted spend reconciled with provider bills.
      *Who: evaluation lead.*
- [ ] Deviations from public goods' validated settings (for example Learning Commons evaluator
      models) are stated beside the results. *Who: evaluation lead.*

## 6. Security review

- [ ] [Threat model](security-and-privacy.md) reviewed against the code at the release commit.
      *Who: maintainer and an independent reviewer.*
- [ ] Tests pass for: agent tokens refused on decide and release; students refused drafts;
      student view shows only released text; fake boundary and injected instructions ignored;
      fabricated quotes dropped; moderation fails closed. *Who: CI. How:* `pnpm test`.
- [ ] Insecure dev mode cannot be enabled by accident in the documented deployment.
      *Who: maintainer.*
- [ ] Error responses contain no student text. *Who: reviewer.*
- [ ] No secrets in the repository or its history. *Who: maintainer. How:* a secret scanner.
- [ ] `SECURITY.md` with a private reporting route. *Who: maintainer.*
- [ ] Program safety review completed and its findings resolved. *Who: Program team with the
      maintainer.*

## 7. Accessibility review

- [ ] The reference React components and the demo are reviewed against WCAG 2.2 AA (keyboard
      use, focus order, screen reader names, contrast, zoom). *Who: an accessibility reviewer.
      How:* automated checks plus manual testing with at least one screen reader.
- [ ] Findings are fixed or documented as known issues. *Who: maintainer.*
- [ ] Docs no longer say "not audited" only once an audit has happened. *Who: maintainer.*

## 8. Documentation completeness

- [ ] README quickstart works from a clean checkout on Node 20 and 22. *Who: second reviewer.*
- [ ] Every HTTP route in `server.ts` and `phase2.ts` is in the
      [integration guide](integration-guide.md). *Who: maintainer.*
- [ ] Every tutorial's calls run against the release. *Who: second reviewer.*
- [ ] `examples/node-client` and `examples/python-client` run against a local model.
      *Who: second reviewer.*
- [ ] The white paper (`docs/white-paper.md`) is published with results, methods and
      limitations. *Who: PI and evaluation lead.*
- [ ] No document claims teacher testing, developer adoption, audits or reviews that did not
      happen. *Who: second reviewer.*
- [ ] [FAIR](fair.md) gaps closed or listed. *Who: maintainer.*

## 9. Versioning

- [ ] Version bumped consistently in every `package.json`, `codemeta.json` and `CITATION.cff`
      (semantic versioning). *Who: maintainer.*
- [ ] `CHANGELOG.md` entry written. *Who: maintainer.*
- [ ] Git tag `vX.Y.Z` created on the release commit. *Who: maintainer.*
- [ ] DOI minted for the tag and added to `CITATION.cff` and `codemeta.json`. *Who: maintainer.*
- [ ] Release archived (Software Heritage) and uploaded to the Program Platform.
      *Who: maintainer with the Program team.*

## 10. Quality gates

- [ ] `pnpm typecheck` passes. *Who: CI.*
- [ ] `pnpm test` passes on Node 20 and 22. *Who: CI.*

## 11. Sign-offs

| Area | Role | Name | Date | Evidence link |
|---|---|---|---|---|
| Licenses and dependencies | Maintainer | | | |
| No student data | Maintainer and second reviewer | | | |
| Evaluation reproducibility | Evaluation lead | | | |
| Security | Independent reviewer | | | |
| Accessibility | Accessibility reviewer | | | |
| Documentation | Second reviewer | | | |
| Program safety review | Program team | | | |
| Release | Principal investigator | | | |
