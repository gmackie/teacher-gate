import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../../skills");
const skills = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

describe("agent skills", () => {
  it("are the three Teacher Gate skills", () => {
    expect(skills.sort()).toEqual(["teacher-gate-class-brief", "teacher-gate-draft-feedback", "teacher-gate-integrate"]);
  });

  it.each(skills)("%s has frontmatter with its name, a description and a CC-BY-4.0 license, and its links resolve", (name) => {
    const text = readFileSync(join(root, name, "SKILL.md"), "utf8");
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1];
    expect(fm).toBeDefined();
    expect(fm).toMatch(new RegExp(`^name: ${name}$`, "m"));
    expect(fm).toMatch(/^description: /m);
    expect(fm).toMatch(/^license: .*SPDX-License-Identifier: CC-BY-4\.0/m);
    for (const [, link] of text.matchAll(/\]\((references\/[^)]+)\)/g)) expect(existsSync(join(root, name, link!))).toBe(true);
  });
});
