# Task 4 evaluation: task4-synthetic-claude-sonnet-5-5

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) — **SYNTHETIC data**; the author's evidence label above "beginning" stands in for the teacher's judgement
- Goal: "Uses measured data from the investigation as evidence for the claim."; model anthropic/claude-sonnet-5-5; 40 items; estimated spend $0.1344

| Measure | Value |
|---|---|
| Agreement with the stand-in teacher judgement (verified judgements) | 87.5% [74–95] (35/40) |
| Cohen's kappa | 0.746 |
| Judgements left unverified (quote not in the work, or unparseable) | 0.0% (0/40) |
| Confusion (tp / fp / fn / tn) | 21 / 0 / 5 / 14 |
