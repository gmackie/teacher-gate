#!/usr/bin/env -S npx tsx
// Runs the Teacher Gate HTTP service from environment variables:
// - PORT (default 8787), TEACHER_GATE_STORE (a JSON file; default in-memory)
// - TEACHER_GATE_TOKENS: JSON object of token -> "product" | "agent"
// - TEACHER_GATE_INSECURE_DEV=1: accept requests without a token (local demos only)
// - TEACHER_GATE_CORS_ORIGINS: comma-separated browser origins
// - the model: see `modelFromEnv` in @teacher-gate/models
import { JsonFileStore, MemoryStore, TeacherGate } from "@teacher-gate/core";
import { modelFromEnv } from "@teacher-gate/models";
import { createServer, type TokenKind } from "./server";
import { phase2Routes } from "./phase2";

const env = process.env;
const tokens = new Map<string, TokenKind>(Object.entries(JSON.parse(env.TEACHER_GATE_TOKENS ?? "{}") as Record<string, TokenKind>));
const insecureDev = env.TEACHER_GATE_INSECURE_DEV === "1";
if (tokens.size === 0 && !insecureDev) {
  console.error("Set TEACHER_GATE_TOKENS, or TEACHER_GATE_INSECURE_DEV=1 for a local demo.");
  process.exit(1);
}
const gate = new TeacherGate({ model: modelFromEnv(env), store: env.TEACHER_GATE_STORE ? new JsonFileStore(env.TEACHER_GATE_STORE) : new MemoryStore() });
const port = Number(env.PORT ?? 8787);
createServer(gate, { tokens, insecureDev, corsOrigins: (env.TEACHER_GATE_CORS_ORIGINS ?? "").split(",").filter(Boolean), routes: phase2Routes() }).listen(port, () => {
  console.log(`Teacher Gate on http://localhost:${port} with ${gate.model.label}${insecureDev ? " (insecure dev mode)" : ""}`);
});
