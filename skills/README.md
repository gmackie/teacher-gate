# Teacher Gate agent skills

Skills that teach AI agents to work with Teacher Gate safely. Each is a folder with a `SKILL.md`
(YAML frontmatter with `name`, `description` and `license`, then instructions in Markdown) and an
optional `references/` folder of files the skill links to and loads only when needed. This is the
open SKILL.md format used by Claude Code, Claude apps and other agents, and by the
[Learning Commons agent skills](https://github.com/learning-commons-org/agent-skills).

| Skill | For |
|---|---|
| [`teacher-gate-draft-feedback`](teacher-gate-draft-feedback/SKILL.md) | An agent drafting rubric feedback through the MCP tools and handing it to the teacher |
| [`teacher-gate-class-brief`](teacher-gate-class-brief/SKILL.md) | An agent drafting a class misconception brief and presenting mappings for confirmation |
| [`teacher-gate-integrate`](teacher-gate-integrate/SKILL.md) | A coding agent integrating Teacher Gate into a product, with a checklist |

The first two expect the Teacher Gate MCP server (`packages/mcp`) to be connected. They share one
rule, which the server and service also enforce: **agents draft and read; only a teacher acting
directly decides on or releases AI output.**

## Installing

Copy a skill folder into your agent's skills directory, e.g. `~/.claude/skills/` or a project's
`.claude/skills/`, or point your agent at this folder.

## License

The skills are documentation and are licensed under
[CC-BY-4.0](../LICENSE-CC-BY-4.0); the `license` field in each frontmatter says so. Attribute
"Teacher Gate contributors" when you adapt them. The code in this repository is Apache-2.0.
