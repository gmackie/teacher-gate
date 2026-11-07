# @teacher-gate/mcp

A review-safe [Model Context Protocol](https://modelcontextprotocol.io) server for Teacher Gate.
It lets an AI agent draft feedback and misconception briefs and read them back. **Agents can draft
and read, never decide or release.** Every result is a suggestion a teacher must review in the
product, where only a teacher acting directly can accept, edit, reject or release it.

## Tools

| Tool | Does |
|---|---|
| `get_activity` | Reads an activity: rubric, AI-help policy, guidance |
| `draft_feedback` | Drafts verified rubric feedback on one submission |
| `get_draft` | Reads the teacher's view of a draft |
| `list_drafts` | Lists drafts, by activity or submission |
| `draft_misconception_brief` | Drafts a class misconception brief (class set + optional catalog) |
| `get_brief` | Reads a brief, the teacher's decisions and what is still open |
| `get_preferences` | Reads the preferences a new draft would apply |

There is no tool that decides, releases, saves a brief, changes preferences, puts activities or
reads the student view, and a test fails if one is added. Results are JSON text; errors come back
as `isError` results carrying only the error code and message.

## Setup

Run the Teacher Gate service with an agent token alongside your product token:

```sh
TEACHER_GATE_TOKENS='{"<product-secret>":"product","<agent-secret>":"agent"}' pnpm --filter @teacher-gate/server start
```

Then configure your MCP client to start the server over stdio. Claude Desktop
(`claude_desktop_config.json`) or a project `.mcp.json` for Claude Code:

```json
{
  "mcpServers": {
    "teacher-gate": {
      "command": "npx",
      "args": ["tsx", "/path/to/teacher-gate/packages/mcp/src/main.ts"],
      "env": {
        "TEACHER_GATE_URL": "http://localhost:8787",
        "TEACHER_GATE_AGENT_TOKEN": "<agent-secret>",
        "TEACHER_GATE_AGENT_ID": "claude-desktop"
      }
    }
  }
}
```

With Claude Code you can also run
`claude mcp add teacher-gate -e TEACHER_GATE_AGENT_TOKEN=<agent-secret> -- npx tsx /path/to/teacher-gate/packages/mcp/src/main.ts`.

| Variable | Meaning |
|---|---|
| `TEACHER_GATE_URL` | The service's base URL. Default `http://localhost:8787`. |
| `TEACHER_GATE_AGENT_TOKEN` | Required. A token the service maps to kind `agent`. |
| `TEACHER_GATE_AGENT_ID` | Optional. The agent's id in the audit log. |

## The safety rule, twice

1. The MCP server registers only draft and read tools.
2. The service forces every request with an agent token onto role `agent` and channel `agent`,
   whatever headers it sends, and the core refuses decisions and releases from any actor that is
   not a teacher on the `direct` channel. Never give the MCP server a product token.

## Embedding

For tests or a single-process deployment, wrap a `TeacherGate` directly. The in-process backend
always acts as `{ id: "mcp-agent", role: "agent", channel: "agent" }`:

```ts
import { createMcpServer, InProcessBackend } from "@teacher-gate/mcp";
const server = createMcpServer(new InProcessBackend(gate, misconceptionCatalog));
await server.connect(transport);
```

## Skills

The [`skills/`](../../skills) folder has agent skills for drafting feedback and briefs through
these tools, and for integrating Teacher Gate into a product.

## License

Apache-2.0. Uses `@modelcontextprotocol/sdk` (MIT).
