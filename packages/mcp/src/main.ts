#!/usr/bin/env -S npx tsx
// Runs the Teacher Gate MCP server on stdio, against a running teacher-gate-server:
// - TEACHER_GATE_URL: the service's base URL (default http://localhost:8787)
// - TEACHER_GATE_AGENT_TOKEN: a token the service maps to kind "agent" (required)
// - TEACHER_GATE_AGENT_ID: an id for the audit log (optional)
// stdout carries the MCP protocol; diagnostics go to stderr.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { HttpBackend } from "./backend";
import { createMcpServer } from "./server";

const env = process.env;
const agentToken = env.TEACHER_GATE_AGENT_TOKEN;
if (!agentToken) {
  console.error("Set TEACHER_GATE_AGENT_TOKEN to a token the Teacher Gate service maps to kind \"agent\".");
  process.exit(1);
}
const backend = new HttpBackend({
  url: env.TEACHER_GATE_URL ?? "http://localhost:8787",
  agentToken,
  ...(env.TEACHER_GATE_AGENT_ID ? { agentId: env.TEACHER_GATE_AGENT_ID } : {}),
});
await createMcpServer(backend).connect(new StdioServerTransport());
console.error("Teacher Gate MCP server running on stdio (review-safe tools only).");
