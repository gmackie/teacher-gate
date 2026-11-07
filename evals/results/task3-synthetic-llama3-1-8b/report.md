# Task 3 simulation: task3-synthetic-llama3-1-8b

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) — **SYNTHETIC data**; simulated rule-based teacher (rejects every "claim" finding; rewrites others to start "Next step:"), not a real teacher
- Model: ollama/llama3.1:8b; first 8 items are warm-up; 16 items measured per arm; estimated spend $0.0000

| Measure (after warm-up) | Learning off | Learning on |
|---|---|---|
| Findings on the always-rejected criterion | 32.6% [21–47] (15/46) | 36.6% [24–52] (15/41) |
| Findings accepted unedited | 0.0% [0–8] (0/46) | 0.0% [0–9] (0/41) |
| Findings already in the teacher's style | 0.0% [0–8] (0/46) | 0.0% [0–9] (0/41) |
| Preferences applied at the end | 0 | deprioritize:claim, edit:675c1b27-df7c-47ff-82a4-33e1f9c8dc99, edit:a05c52da-5ce7-4c4d-9a7c-3f6edc1e5581, edit:252ae59a-d6c2-4eb5-bf27-7eb1d3fd0253 |
