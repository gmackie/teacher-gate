#!/usr/bin/env node
// `pnpm demo`: runs the Teacher Gate service and the demo's Vite dev server together, without a
// process-manager dependency. Ctrl-C stops both; if either exits, the other is stopped too.
//
// The service runs in insecure dev mode (no tokens) on port 8787. The model comes from the
// environment (see packages/models/src/env.ts); by default Ollama with qwen2.5:7b.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const env = { ...process.env };
env.TEACHER_GATE_INSECURE_DEV = "1";
env.TEACHER_GATE_PROVIDER ??= "ollama";
if (env.TEACHER_GATE_PROVIDER === "ollama") env.TEACHER_GATE_MODEL ??= "qwen2.5:7b";
env.PORT ??= "8787";
env.TEACHER_GATE_URL ??= `http://localhost:${env.PORT}`;

const shell = process.platform === "win32";
const children = [
  spawn("pnpm", ["--filter", "@teacher-gate/server", "start"], { cwd: root, env, stdio: "inherit", shell }),
  spawn("pnpm", ["--filter", "@teacher-gate/demo", "dev"], { cwd: root, env, stdio: "inherit", shell }),
];

let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const c of children) if (c.exitCode === null) c.kill("SIGTERM");
  process.exitCode = code;
}
for (const c of children) c.on("exit", (code) => stop(code ?? 0));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
