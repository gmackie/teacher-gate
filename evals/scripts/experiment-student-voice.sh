#!/usr/bin/env bash
# Separate experiment (see evals/results/experiments/README.md): does one teacher instruction,
# passed through the existing `guidance.instructions` field, fix the harness's low Learning Commons
# actionability and specificity on ELLIPSE? No harness code changes; the baseline prompt is
# unchanged. Run from commit d3a8406 to reproduce the published experiment.
#
#   RESULTS=/path/to/experiment-results ./evals/scripts/experiment-student-voice.sh
set -eu
cd "$(dirname "$0")/../../packages/evals"
R=${RESULTS:-$(pwd)/../../evals/results-experiments}
DATA=${DATA:-$(mktemp -d)}
mkdir -p "$R"
DATA="$DATA" pnpm exec tsx -e '
import { loadEllipse } from "@teacher-gate/public-goods";
import { writeFileSync } from "node:fs";
(async () => {
  const ds = await loadEllipse();
  const instructions = "Write each observation to the student, addressing them as \"you\". In the second sentence, give one concrete next step the student can take in a revision, tied to the quoted words.";
  const out = { ...ds, id: ds.id + "-student-voice", title: ds.title + " (experiment: teacher instruction for student-addressed, actionable wording)", activity: { ...ds.activity, guidance: { ...(ds.activity.guidance ?? {}), instructions } } };
  writeFileSync(process.env.DATA + "/ellipse-student-voice.json", JSON.stringify(out));
})();
'
pnpm eval task1 --dataset "$DATA/ellipse-student-voice.json" --model anthropic:claude-haiku-5-5 \
  --group race_ethnicity --groups "Hispanic/Latino,Asian/Pacific Islander,Black/African American,White" \
  --per-group 10 --judge anthropic:claude-haiku-5-5 --concurrency 4 \
  --run exp-student-voice-ellipse-claude-haiku-5-5 --results "$R"
