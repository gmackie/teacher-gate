# Task 4 evaluation: task4-synthetic-claude-haiku-5-5

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) — **SYNTHETIC data**; the author's evidence label above "beginning" stands in for the teacher's judgement
- Goal: "Uses measured data from the investigation as evidence for the claim."; model anthropic/claude-haiku-5-5; 40 items; estimated spend $0.0102

| Measure | Value |
|---|---|
| Agreement with the stand-in teacher judgement (verified judgements) | 90.0% [77–96] (36/40) |
| Cohen's kappa | 0.794 |
| Judgements left unverified (quote not in the work, or unparseable) | 0.0% (0/40) |
| Confusion (tp / fp / fn / tn) | 22 / 0 / 4 / 14 |
