# Examples

Small clients that drive the Teacher Gate HTTP service, besides the full demo in
[`apps/demo`](../apps/demo). Each runs the whole teacher-in-control loop on one synthetic
paragraph from [`data/synthetic/cer-feedback.json`](../data/synthetic/cer-feedback.json): put the
activity, draft feedback, read the teacher's view, accept / edit / reject each finding, release,
and read the student view.

| Example | Language | Needs |
|---|---|---|
| [`node-client`](node-client) | TypeScript (Node 20+) | Nothing beyond the repository's install |
| [`python-client`](python-client) | Python 3 | Standard library only |

Both use a local model through Ollama by default, so they cost nothing. Start the service first:

```sh
ollama pull qwen2.5:7b
TEACHER_GATE_INSECURE_DEV=1 TEACHER_GATE_PROVIDER=ollama TEACHER_GATE_MODEL=qwen2.5:7b \
  pnpm --filter @teacher-gate/server start
```

The clients decide on findings by a fixed rule (accept, edit, reject in turn) so they can run
unattended. A real product shows each finding to the teacher, who decides.

All data is synthetic. Code is Apache-2.0; these READMEs are CC-BY-4.0.
