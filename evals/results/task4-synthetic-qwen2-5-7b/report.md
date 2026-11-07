# Task 4 evaluation: task4-synthetic-qwen2-5-7b

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) — **SYNTHETIC data**; the author's evidence label above "beginning" stands in for the teacher's judgement
- Goal: "Uses measured data from the investigation as evidence for the claim."; model ollama/qwen2.5:7b; 40 items; estimated spend $0.0000

| Measure | Value |
|---|---|
| Agreement with the stand-in teacher judgement (verified judgements) | 82.1% [67–91] (32/39) |
| Cohen's kappa | 0.618 |
| Judgements left unverified (quote not in the work, or unparseable) | 2.5% (1/40) |
| Confusion (tp / fp / fn / tn) | 21 / 2 / 5 / 11 |
