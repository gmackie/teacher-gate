# Task 2 evaluation: task2-synthetic-qwen2-5-7b

- Dataset: Synthetic science misconception catalog and labelled class sets (SYNTHETIC placeholder for learning-equality-misconception-maps) (CC-BY-4.0) — **SYNTHETIC data, author-labelled**
- 3 class sets, 42 responses, 15 catalog entries
- Model: ollama/qwen2.5:7b; estimated spend $0.0000

| Measure | Harness | Direct prompting |
|---|---|---|
| Mapping precision vs labels | 62.5% [39–82] (10/16) | 40.0% [26–55] (16/40) |
| Mapping recall vs labels | 26.3% [15–42] (10/38) | 42.1% [28–58] (16/38) |
| F1 | 0.370 | 0.410 |
| Mappings returned with a quote not in that response | 52.4% (22/42) | 17.5% (7/40) |
| **Such mappings reaching the teacher** | 0.0% (0/16) | 17.5% (7/40) |
| Mappings naming a misconception not in the catalog | 28.6% (12/42) | 12.5% (5/40) |

Precision and recall are before the teacher's confirmation step, which removes wrong mappings in the harness.
