# Task 2 evaluation: task2-synthetic-llama3-1-8b

- Dataset: Synthetic science misconception catalog and labelled class sets (SYNTHETIC placeholder for learning-equality-misconception-maps) (CC-BY-4.0) — **SYNTHETIC data, author-labelled**
- 3 class sets, 42 responses, 15 catalog entries
- Model: ollama/llama3.1:8b; estimated spend $0.0000

| Measure | Harness | Direct prompting |
|---|---|---|
| Mapping precision vs labels | 100.0% [85–100] (21/21) | 62.5% [47–76] (25/40) |
| Mapping recall vs labels | 55.3% [40–70] (21/38) | 65.8% [50–79] (25/38) |
| F1 | 0.712 | 0.641 |
| Mappings returned with a quote not in that response | 12.5% (3/24) | 12.5% (5/40) |
| **Such mappings reaching the teacher** | 0.0% (0/21) | 12.5% (5/40) |
| Mappings naming a misconception not in the catalog | 8.3% (2/24) | 25.0% (10/40) |

Precision and recall are before the teacher's confirmation step, which removes wrong mappings in the harness.
