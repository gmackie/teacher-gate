# Task 3 simulation: task3-synthetic-qwen2-5-7b

- Dataset: Synthetic claim-evidence-reasoning paragraphs: ice on metal and plastic plates (SYNTHETIC placeholder for playlab-cer-feedback) — **SYNTHETIC data**; simulated rule-based teacher (rejects every "claim" finding; rewrites others to start "Next step:"), not a real teacher
- Model: ollama/qwen2.5:7b; first 8 items are warm-up; 16 items measured per arm; estimated spend $0.0000

| Measure (after warm-up) | Learning off | Learning on |
|---|---|---|
| Findings on the always-rejected criterion (reaching the teacher) | 33.3% [22–47] (16/48) | 0.0% [0–10] (0/33) |
| Findings the model wrote on it, before the harness held them back | 33.3% [22–47] (16/48) | 0.0% [0–10] (0/33) |
| Findings reaching the teacher per item | 3.00 | 2.06 |
| Findings accepted unedited | 0.0% [0–7] (0/48) | 0.0% [0–10] (0/33) |
| Findings already in the teacher's style | 0.0% [0–7] (0/48) | 0.0% [0–10] (0/33) |
| Preferences applied at the end | 0 | deprioritize:claim, edit:4e313643-bf4e-42af-b4d3-dde586bbcfd8, edit:e877391a-3ad7-4202-b8b2-dad563767d3d, edit:ef91e5a4-47bd-45dc-b341-e776788c2b53 |
