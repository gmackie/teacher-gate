# Task 3 simulation: task3-synthetic-claude-haiku-5-5

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) — **SYNTHETIC data**; simulated rule-based teacher (rejects every "claim" finding; rewrites others to start "Next step:"), not a real teacher
- Model: anthropic/claude-haiku-5-5; first 8 items are warm-up; 16 items measured per arm; estimated spend $0.0460

| Measure (after warm-up) | Learning off | Learning on |
|---|---|---|
| Findings on the always-rejected criterion (reaching the teacher) | 34.0% [22–48] (16/47) | 0.0% [0–11] (0/31) |
| Findings the model wrote on it, before the harness held them back | 34.0% [22–48] (16/47) | 0.0% [0–11] (0/31) |
| Findings reaching the teacher per item | 2.94 | 1.94 |
| Findings accepted unedited | 0.0% [0–8] (0/47) | 0.0% [0–11] (0/31) |
| Findings already in the teacher's style | 0.0% [0–8] (0/47) | 0.0% [0–11] (0/31) |
| Preferences applied at the end | 0 | deprioritize:claim, edit:7ec7def4-7cf4-4462-b0e3-f660cfb7183d, edit:652d7059-9d73-40ec-8d3d-23dc50541d66, edit:5c108542-5e70-49b2-8109-b5aab0829ea4 |
