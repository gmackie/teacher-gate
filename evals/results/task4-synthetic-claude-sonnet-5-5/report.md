# Task 4 evaluation: task4-synthetic-claude-sonnet-5-5

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) — **SYNTHETIC data**; the author's evidence label above "beginning" stands in for the teacher's judgement
- Goal: "Uses measured data from the investigation as evidence for the claim."; model anthropic/claude-sonnet-5-5; 40 items; estimated spend $0.1328

| Measure | Value |
|---|---|
| Agreement with the stand-in teacher judgement (verified judgements) | 85.0% [71–93] (34/40) |
| Cohen's kappa | 0.700 |
| Judgements left unverified (quote not in the work, or unparseable) | 0.0% (0/40) |
| Confusion (tp / fp / fn / tn) | 20 / 0 / 6 / 14 |
