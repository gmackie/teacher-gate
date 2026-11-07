# Task 3 simulation: task3-synthetic-claude-haiku-5-5

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) — **SYNTHETIC data**; simulated rule-based teacher (rejects every "claim" finding; rewrites others to start "Next step:"), not a real teacher
- Model: anthropic/claude-haiku-5-5; first 8 items are warm-up; 16 items measured per arm; estimated spend $0.0300

| Measure (after warm-up) | Learning off | Learning on |
|---|---|---|
| Findings on the always-rejected criterion | 32.6% [21–47] (15/46) | 100.0% [80–100] (15/15) |
| Findings accepted unedited | 0.0% [0–8] (0/46) | 0.0% [0–20] (0/15) |
| Findings already in the teacher's style | 0.0% [0–8] (0/46) | 0.0% [0–20] (0/15) |
| Preferences applied at the end | 0 | deprioritize:claim, edit:1d823c41-b353-4652-9eb2-f3d163aa2222, edit:cb7da6eb-c7b5-472d-ba19-b0087d4e0a11, edit:3fe0d475-9c27-4dcd-a9c3-fc2593bc163d |
