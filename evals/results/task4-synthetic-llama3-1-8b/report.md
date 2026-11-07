# Task 4 evaluation: task4-synthetic-llama3-1-8b

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) — **SYNTHETIC data**; the author's evidence label above "beginning" stands in for the teacher's judgement
- Goal: "Uses measured data from the investigation as evidence for the claim."; model ollama/llama3.1:8b; 40 items; estimated spend $0.0000

| Measure | Value |
|---|---|
| Agreement with the stand-in teacher judgement (verified judgements) | 42.5% [29–58] (17/40) |
| Cohen's kappa | 0.084 |
| Judgements left unverified (quote not in the work, or unparseable) | 0.0% (0/40) |
| Confusion (tp / fp / fn / tn) | 3 / 0 / 23 / 14 |
