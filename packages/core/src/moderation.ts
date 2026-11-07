// Content moderation is a pluggable interface. Teacher Gate ships no moderation model: deployers
// plug in the one their district has approved. Moderation runs on every student-facing text at
// release and fails closed: if the moderator throws, nothing is released.

/** What a moderator decided about one text. */
export interface ModerationResult {
  allowed: boolean;
  /** Category names, for the teacher; never the text itself. */
  categories?: string[];
}

/** A content moderator for text a student will see. */
export interface Moderator {
  readonly name: string;
  check(text: string, context: { audience: "student" | "family" }): Promise<ModerationResult>;
}

/**
 * No moderation. The teacher's review is then the only check on student-facing text. Named
 * explicitly so a deployment's choice is visible in its configuration and audit trail.
 */
export const noModeration: Moderator = {
  name: "none",
  async check() {
    return { allowed: true };
  },
};

/**
 * A simple deny-list moderator, as an example of the interface. It matches whole words,
 * case-insensitively. It is not a substitute for a real moderation model.
 */
export function denyListModerator(words: readonly string[], name = "deny-list"): Moderator {
  const patterns = words.map((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"));
  return {
    name,
    async check(text) {
      const hits = patterns.filter((p) => p.test(text));
      return hits.length === 0 ? { allowed: true } : { allowed: false, categories: ["deny-list"] };
    },
  };
}
