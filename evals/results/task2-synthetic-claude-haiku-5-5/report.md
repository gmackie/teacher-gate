# Task 2 evaluation: task2-synthetic-claude-haiku-5-5

- Dataset: Synthetic science misconception catalog and labelled class sets (SYNTHETIC placeholder for learning-equality-misconception-maps) (CC-BY-4.0) — **SYNTHETIC data, author-labelled**
- 3 class sets, 42 responses, 15 catalog entries
- Model: anthropic/claude-haiku-5-5; estimated spend $0.0084

| Measure | Harness | Direct prompting |
|---|---|---|
| Mapping precision vs labels | 97.3% [86–100] (36/37) | 94.7% [83–99] (36/38) |
| Mapping recall vs labels | 94.7% [83–99] (36/38) | 94.7% [83–99] (36/38) |
| F1 | 0.960 | 0.947 |
| Mappings returned with a quote not in that response | 0.0% (0/37) | 2.5% (1/40) |
| **Such mappings reaching the teacher** | 0.0% (0/37) | 2.5% (1/40) |
| Mappings naming a misconception not in the catalog | 0.0% (0/37) | 0.0% (0/40) |

Precision and recall are before the teacher's confirmation step, which removes wrong mappings in the harness.
