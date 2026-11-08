# Task 3 simulation: task3-synthetic-claude-sonnet-5-5

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) — **SYNTHETIC data**; simulated rule-based teacher (rejects every "claim" finding; rewrites others to start "Next step:"), not a real teacher
- Model: anthropic/claude-sonnet-5-5; first 8 items are warm-up; 16 items measured per arm; estimated spend $0.6426

| Measure (after warm-up) | Learning off | Learning on |
|---|---|---|
| Findings on the always-rejected criterion (reaching the teacher) | 34.0% [22–48] (16/47) | 0.0% [0–11] (0/32) |
| Findings the model wrote on it, before the harness held them back | 34.0% [22–48] (16/47) | 0.0% [0–11] (0/32) |
| Findings reaching the teacher per item | 2.94 | 2.00 |
| Findings accepted unedited | 0.0% [0–8] (0/47) | 12.5% [5–28] (4/32) |
| Findings already in the teacher's style | 0.0% [0–8] (0/47) | 12.5% [5–28] (4/32) |
| Preferences applied at the end | 0 | deprioritize:claim, edit:bf02d453-83f8-4d95-8fc8-9740137b070b, edit:ef5011ac-ad5f-4296-bf98-c980655e2a96, edit:8f969387-48b3-4b49-a56d-4082d6126722 |
