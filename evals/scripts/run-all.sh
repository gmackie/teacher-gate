#!/usr/bin/env bash
# Re-runs every evaluation reported in evals/results/RESULTS.md and docs/white-paper.md.
#
# The published runs were made from two commits:
#   - Task 1 (ELLIPSE and synthetic CER) and Task 2: 975da0c2a0a041b03a08de3d67c2fef8bb002a29
#   - Tasks 3 and 4:                                  d3a8406676d7d3edbc0c6575c7b7ef77515f73a9
# Check out the matching commit before re-running a task to reproduce it exactly; later commits
# may change prompts. Hosted model outputs (Anthropic) are not deterministic even at the same
# commit; Ollama runs use temperature 0 and seed 42.
#
# Needs: pnpm install; ANTHROPIC_API_KEY for hosted models and for the judge; Ollama running with
# qwen2.5:7b and llama3.1:8b pulled. Spend is capped by TEACHER_GATE_EVAL_CAP_USD (default 40)
# across every run that shares the results directory; the published set cost about $8.
#
#   RESULTS=/path/to/results ./evals/scripts/run-all.sh
#
# Runs that already have a summary.json in $RESULTS are skipped, so the script can be resumed.
set -u
cd "$(dirname "$0")/../../packages/evals"
R=${RESULTS:-$(pwd)/../../evals/results-rerun}
mkdir -p "$R"
G="Hispanic/Latino,Asian/Pacific Islander,Black/African American,White"
JUDGE=anthropic:claude-haiku-5-5

for S in anthropic:claude-haiku-5-5 anthropic:claude-sonnet-5-5 ollama:qwen2.5:7b ollama:llama3.1:8b; do
  N=${S#*:}; N=${N//[:.]/-}
  [ -f "$R/task1-ellipse-$N/summary.json" ] || pnpm eval task1 --dataset ellipse --model "$S" --group race_ethnicity --groups "$G" --per-group 20 --judge $JUDGE --concurrency 4 --run "task1-ellipse-$N" --results "$R"
  [ -f "$R/task1-synthetic-cer-$N/summary.json" ] || pnpm eval task1 --dataset synthetic-cer --model "$S" --judge $JUDGE --concurrency 4 --run "task1-synthetic-cer-$N" --results "$R"
  for T in task2 task3 task4; do
    [ -f "$R/$T-synthetic-$N/summary.json" ] || pnpm eval $T --model "$S" --run "$T-synthetic-$N" --results "$R"
  done
done
node ../../evals/results/build-table.mjs "$R"
