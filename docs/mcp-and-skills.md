# MCP server and agent skills

Teacher Gate can be used by AI agents through a Model Context Protocol (MCP) server, and agents can
learn how to use it through agent skills. Both follow one rule: **agents draft and read; only a
teacher acting directly in the product decides on or releases AI output.**

## The MCP server (`packages/mcp`)

The server speaks MCP over stdio. It registers seven tools:

| Tool | Does | Teacher Gate call |
|---|---|---|
| `get_activity` | Reads an activity: rubric, AI-help policy, guidance | `GET /v1/activities/:id` |
| `draft_feedback` | Drafts verified rubric feedback on one submission | `POST /v1/drafts` |
| `get_draft` | Reads the teacher's view of a draft | `GET /v1/drafts/:id` |
| `list_drafts` | Lists drafts by activity or submission | `GET /v1/drafts` |
| `draft_misconception_brief` | Drafts a class misconception brief | `POST /v1/briefs` |
| `get_brief` | Reads a brief, its decisions and what is still open | `GET /v1/briefs/:id` |
| `get_preferences` | Reads the preferences a new draft would apply | `GET /v1/activities/:id/preferences` |

There is no tool that decides, releases, saves a brief, changes preferences, puts an activity, or
reads the student view. A test (`packages/mcp/test/mcp.test.ts`) fails if one is added. Each tool
description and the server's instructions tell the agent that results are suggestions a teacher
must review. Results are JSON text. Errors come back as `isError` results with only the error code
and message.

The goal (Task 4) and variant routes have no MCP tools in 0.1.0.

### How the rule is enforced

The rule holds even if an agent is told to break it, because it does not rely on the agent:

1. The MCP server registers only draft and read tools.
2. The service maps the MCP server's token to kind `agent`. Every request with that token acts as
   role `agent` on channel `agent`, whatever headers it sends.
3. The core refuses decisions, releases, saves and approvals from any actor that is not a teacher
   on channel `direct`, and audits the refusal.

Never give the MCP server a `product` token. With a product token the HTTP backend's requests
would carry whatever role headers it sends.

### Setup

Run the service with an agent token as well as your product token:

```sh
TEACHER_GATE_TOKENS='{"<product-secret>":"product","<agent-secret>":"agent"}' \
  pnpm --filter @teacher-gate/server start
```

Configure your MCP client to start the server, for example in Claude Desktop's
`claude_desktop_config.json` or a project's `.mcp.json`:

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

| Variable | Meaning |
|---|---|
| `TEACHER_GATE_URL` | The service's base URL. Default `http://localhost:8787` |
| `TEACHER_GATE_AGENT_TOKEN` | Required. A token the service maps to kind `agent` |
| `TEACHER_GATE_AGENT_ID` | Optional. The agent's id in the audit log |

### Embedding

For tests or a single process, `InProcessBackend` wraps a `TeacherGate` directly and always acts
as `{ id: "mcp-agent", role: "agent", channel: "agent" }`:

```ts
import { createMcpServer, InProcessBackend } from "@teacher-gate/mcp";

const server = createMcpServer(new InProcessBackend(gate, misconceptionCatalog));
await server.connect(transport);
```

`HttpBackend` is the one `main.ts` uses against a running service. You can implement the
`TeacherGateBackend` interface for another transport.

See also [packages/mcp/README.md](../packages/mcp/README.md).

## Agent skills (`skills/`)

Skills are folders with a `SKILL.md` (YAML frontmatter with `name`, `description` and `license`,
then instructions) and an optional `references/` folder the skill loads only when needed. This is
the open SKILL.md format used by Claude Code, Claude apps and other agents, and by the Learning
Commons agent skills.

| Skill | For | References |
|---|---|---|
| [`teacher-gate-draft-feedback`](../skills/teacher-gate-draft-feedback/SKILL.md) | An agent drafting rubric feedback through the MCP tools and handing the draft to the teacher | `handoff.md` |
| [`teacher-gate-class-brief`](../skills/teacher-gate-class-brief/SKILL.md) | An agent drafting a misconception brief and presenting mappings for confirmation | `presenting.md` |
| [`teacher-gate-integrate`](../skills/teacher-gate-integrate/SKILL.md) | A coding agent integrating Teacher Gate into a product, with a checklist | `http-routes.md` |

The first two expect the MCP server to be connected. The third is for coding agents working in a
developer's codebase.

To install a skill, copy its folder into your agent's skills directory (for example
`~/.claude/skills/` or a project's `.claude/skills/`).

A test (`packages/mcp/test/skills.test.ts`) checks that the three skills are present with valid
frontmatter.

Skills are instructions to an agent. They do not enforce anything; the service and core do. They
are licensed CC-BY-4.0.

## What has not been done

The MCP server and skills are tested with automated tests only. They have not been used by
teachers or by a developer's agent in a product.
