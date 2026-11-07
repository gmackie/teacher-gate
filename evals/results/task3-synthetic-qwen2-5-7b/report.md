# Task 3 simulation: task3-synthetic-qwen2-5-7b

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) — **SYNTHETIC data**; simulated rule-based teacher (rejects every "claim" finding; rewrites others to start "Next step:"), not a real teacher
- Model: ollama/qwen2.5:7b; first 8 items are warm-up; 16 items measured per arm; estimated spend $0.0000

| Measure (after warm-up) | Learning off | Learning on |
|---|---|---|
| Findings on the always-rejected criterion | 34.8% [23–49] (16/46) | 38.1% [25–53] (16/42) |
| Findings accepted unedited | 0.0% [0–8] (0/46) | 0.0% [0–8] (0/42) |
| Findings already in the teacher's style | 0.0% [0–8] (0/46) | 0.0% [0–8] (0/42) |
| Preferences applied at the end | 0 | deprioritize:claim, edit:62c0241a-0a60-48ea-95c9-bae920e7938f, edit:0e4af0af-294c-4f35-be3a-bfdfe558c97f, edit:5e7ac286-4612-41b3-9bf3-9b3165a01be9 |
