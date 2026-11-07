// Cached downloads. Third-party data is fetched into a local data directory (never committed) and,
// where a checksum is known, verified before use.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The repository root, found from this file. */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Where downloads go: `TEACHER_GATE_DATA_DIR`, or `data/downloads` in the repository. */
export function dataDir(): string {
  return process.env.TEACHER_GATE_DATA_DIR ?? join(REPO_ROOT, "data", "downloads");
}

/** The hex SHA-256 of some bytes. */
export function sha256(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Downloads `url` to `<dataDir>/<path>` unless it is already there, and checks `expectedSha256`
 * when given. Returns the local path.
 */
export async function cachedDownload(url: string, path: string, expectedSha256?: string): Promise<string> {
  const target = join(dataDir(), path);
  if (!existsSync(target)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}): ${url}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
  if (expectedSha256 !== undefined) {
    const actual = sha256(readFileSync(target));
    if (actual !== expectedSha256) throw new Error(`Checksum mismatch for ${path}: expected ${expectedSha256}, got ${actual}. Delete it to re-download.`);
  }
  return target;
}

/** Parses RFC 4180 CSV (quoted fields, doubled quotes, newlines in quotes) into rows of strings. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** CSV rows as objects keyed by the header row. */
export function csvObjects(text: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  if (header === undefined) return [];
  return rows.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]!])));
}
