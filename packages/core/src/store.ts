// Where Teacher Gate keeps its records. The developer supplies a store backed by their own
// database; `MemoryStore` serves tests, demos and the evaluation suite, and `JsonFileStore` a
// single-process service.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { AuditRecord, DecisionRecord, FeedbackDraft, ReleaseRecord } from "./records";

/** A generic keyed document collection, so new record kinds need no new store methods. */
export interface Store {
  get<T>(collection: string, id: string): Promise<T | undefined>;
  put<T>(collection: string, id: string, value: T): Promise<void>;
  list<T>(collection: string, filter?: (value: T) => boolean): Promise<T[]>;
  /** Appends an audit record and returns its sequence number. */
  appendAudit(record: Omit<AuditRecord, "seq">): Promise<number>;
  audit(filter?: (r: AuditRecord) => boolean): Promise<AuditRecord[]>;
}

/** The collection names the core uses. */
export const C = {
  activities: "activities",
  drafts: "drafts",
  decisions: "decisions",
  releases: "releases",
  briefs: "briefs",
  goals: "goals",
  goalJudgments: "goal-judgments",
  goalRuns: "goal-runs",
  disabledPreferences: "disabled-preferences",
} as const;

/** Record types by collection, for callers who want them. */
export interface Collections {
  drafts: FeedbackDraft;
  decisions: DecisionRecord;
  releases: ReleaseRecord;
}

/** An in-memory store. Values are deep-copied in and out, so callers cannot mutate stored records. */
export class MemoryStore implements Store {
  protected data = new Map<string, Map<string, unknown>>();
  protected log: AuditRecord[] = [];

  async get<T>(collection: string, id: string): Promise<T | undefined> {
    const v = this.data.get(collection)?.get(id);
    return v === undefined ? undefined : structuredClone(v as T);
  }
  async put<T>(collection: string, id: string, value: T): Promise<void> {
    let c = this.data.get(collection);
    if (c === undefined) this.data.set(collection, (c = new Map()));
    c.set(id, structuredClone(value));
    this.changed();
  }
  async list<T>(collection: string, filter?: (value: T) => boolean): Promise<T[]> {
    const all = [...(this.data.get(collection)?.values() ?? [])].map((v) => structuredClone(v as T));
    return filter === undefined ? all : all.filter(filter);
  }
  async appendAudit(record: Omit<AuditRecord, "seq">): Promise<number> {
    const seq = this.log.length + 1;
    this.log.push({ seq, ...structuredClone(record) });
    this.changed();
    return seq;
  }
  async audit(filter?: (r: AuditRecord) => boolean): Promise<AuditRecord[]> {
    const all = this.log.map((r) => structuredClone(r));
    return filter === undefined ? all : all.filter(filter);
  }
  /** Called after every write. */
  protected changed(): void {}
}

/** A {@link MemoryStore} persisted to one JSON file after every write. For demos and single-process services. */
export class JsonFileStore extends MemoryStore {
  constructor(readonly path: string) {
    super();
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as { data: Record<string, Record<string, unknown>>; audit: AuditRecord[] };
      for (const [name, docs] of Object.entries(raw.data)) this.data.set(name, new Map(Object.entries(docs)));
      this.log = raw.audit;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  protected override changed(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const data = Object.fromEntries([...this.data].map(([k, v]) => [k, Object.fromEntries(v)]));
    writeFileSync(this.path, JSON.stringify({ data, audit: this.log }));
  }
}
