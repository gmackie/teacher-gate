# Quickstart

This gets the demo, the HTTP service and the example clients running on your machine. The
default model is a local open-weight model through Ollama, so nothing is sent to a hosted API and
nothing costs money.

## Requirements

- Node.js 20 or later. (Installing dependencies with pnpm 11 needs Node 22 or later; the library
  itself runs on Node 20, and CI checks both.)
- pnpm (the repository pins `pnpm@11.17.0` in `package.json`).
- For the default model: [Ollama](https://ollama.com) and about 5 GB of disk for `qwen2.5:7b`.
- Optional: Python 3 for the Python example client (standard library only).

## 1. Install

```sh
git clone https://github.com/gmackie/teacher-gate
cd teacher-gate
pnpm install
```

Check the install:

```sh
pnpm typecheck
pnpm test
```

Tests use a scripted model. They make no network calls.

## 2. Run the demo

```sh
ollama pull qwen2.5:7b
pnpm demo
```

Open <http://localhost:5173>. `pnpm demo` starts two processes:

- the service on port 8787, in insecure dev mode (`TEACHER_GATE_INSECURE_DEV=1`, no tokens);
- the Vite dev server on port 5173, which proxies `/v1` and `/healthz` to the service.

In the demo you can:

1. Draft feedback on one of three synthetic grade-8 science paragraphs, review each finding,
   release, then switch to the student view. The third paragraph contains a prompt-injection
   attempt.
2. Draft a class misconception brief over six synthetic responses, confirm or reject each
   mapping, and save the brief.

A 7B model on a laptop takes roughly 10 to 60 seconds per draft.

### Other models

| You want | Set |
|---|---|
| Another Ollama model | `TEACHER_GATE_MODEL=llama3.1:8b` |
| Ollama on another host | `OLLAMA_HOST=http://host:11434` |
| Anthropic (paid) | `TEACHER_GATE_PROVIDER=anthropic ANTHROPIC_API_KEY=...` (default model `claude-haiku-5-5`) |
| OpenAI or another OpenAI-compatible API (paid) | `TEACHER_GATE_PROVIDER=openai OPENAI_API_KEY=... [OPENAI_BASE_URL=...]` (default model `gpt-4o-mini`) |
| A vLLM server | `TEACHER_GATE_PROVIDER=vllm TEACHER_GATE_MODEL=<served model> [VLLM_BASE_URL=...]` |

All of these are read by `modelFromEnv` in `packages/models/src/env.ts`.

## 3. Run the service on its own

```sh
TEACHER_GATE_INSECURE_DEV=1 TEACHER_GATE_PROVIDER=ollama TEACHER_GATE_MODEL=qwen2.5:7b \
  pnpm --filter @teacher-gate/server start
```

Check it:

```sh
curl -s localhost:8787/healthz
# {"ok":true,"model":"ollama/qwen2.5:7b"}
```

For anything other than a local demo, use tokens instead of insecure dev mode:

```sh
TEACHER_GATE_TOKENS='{"<product-secret>":"product","<agent-secret>":"agent"}' \
  pnpm --filter @teacher-gate/server start
```

Records are kept in memory unless you set `TEACHER_GATE_STORE=/path/to/records.json`. See the
[integration guide](integration-guide.md) for every route and variable.

## 4. Run an example client

With the service running:

```sh
pnpm tsx examples/node-client/index.ts            # TypeScript, no dependencies
python3 examples/python-client/client.py          # Python 3, standard library only
```

Each client puts the synthetic activity, drafts feedback on one paragraph from
`data/synthetic/cer-feedback.json`, prints the teacher's view, accepts, edits and rejects
findings in turn, releases, and prints the student view. Pass an item id (for example
`syn-cer-35`, one of the prompt-injection items) to try another paragraph. See
[examples/README.md](../examples/README.md).

## 5. Next steps

- [Architecture](architecture.md) explains the flow and the access rules.
- [Tutorial 1](tutorials/task1-verifiable-feedback.md) walks through the same calls with curl.
- [Integration guide](integration-guide.md) is the reference for building it into a product.
