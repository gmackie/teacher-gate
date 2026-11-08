# Task 2 evaluation: task2-synthetic-claude-sonnet-5-5

- Dataset: Synthetic science misconception catalog and labelled class sets (SYNTHETIC placeholder for learning-equality-misconception-maps) (CC-BY-4.0) — **SYNTHETIC data, author-labelled**
- 3 class sets, 42 responses, 15 catalog entries
- Model: anthropic/claude-sonnet-5-5; estimated spend $0.1117

| Measure | Harness | Direct prompting |
|---|---|---|
| Mapping precision vs labels | 100.0% [90–100] (35/35) | 95.0% [83–99] (38/40) |
| Mapping recall vs labels | 92.1% [79–97] (35/38) | 100.0% [91–100] (38/38) |
| F1 | 0.959 | 0.974 |
| Mappings returned with a quote not in that response | 0.0% (0/35) | 0.0% (0/40) |
| **Such mappings reaching the teacher** | 0.0% (0/35) | 0.0% (0/40) |
| Mappings naming a misconception not in the catalog | 0.0% (0/35) | 0.0% (0/40) |

Precision and recall are before the teacher's confirmation step, which removes wrong mappings in the harness.
