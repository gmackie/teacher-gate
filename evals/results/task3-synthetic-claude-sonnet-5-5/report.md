# Task 3 simulation: task3-synthetic-claude-sonnet-5-5

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) — **SYNTHETIC data**; simulated rule-based teacher (rejects every "claim" finding; rewrites others to start "Next step:"), not a real teacher
- Model: anthropic/claude-sonnet-5-5; first 8 items are warm-up; 16 items measured per arm; estimated spend $0.5580

| Measure (after warm-up) | Learning off | Learning on |
|---|---|---|
| Findings on the always-rejected criterion | 34.0% [22–48] (16/47) | 20.0% [10–35] (8/40) |
| Findings accepted unedited | 0.0% [0–8] (0/47) | 40.0% [26–55] (16/40) |
| Findings already in the teacher's style | 0.0% [0–8] (0/47) | 47.5% [33–63] (19/40) |
| Preferences applied at the end | 0 | deprioritize:claim, edit:29e0c88b-28bd-43a9-b425-67c4da253eb5, edit:533ce351-b8a9-4a40-bec6-d30504ac655d, edit:94a230cd-b013-4340-9454-bceb77c8dc80 |
