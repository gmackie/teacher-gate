// A thin HTTP service over a TeacherGate. JSON in, JSON out, no framework.
//
// Authentication: every request carries `Authorization: Bearer <token>`. Each token has a kind,
// set by the deployer, never by the caller:
// - `product`: the developer's own backend, which has signed in the user. It states who is acting
//   with `X-Actor-Id` and `X-Actor-Role` (teacher, student or service), on the `direct` channel.
// - `agent`: an AI agent or another harness (the MCP server uses one). Its requests always act as
//   role `agent` on the `agent` channel, whatever headers it sends, so it can draft and read but
//   never decide or release.
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { decideMapping, draftMisconceptionBrief, GateError, getBrief, saveBrief, type Actor, type Misconception, type TeacherGate } from "@teacher-gate/core";

/** The kind of caller a token belongs to. */
export type TokenKind = "product" | "agent";

/** Options for {@link createServer}. */
export interface ServerOptions {
  /** Bearer tokens and their kinds. Empty with `insecureDev` treats every caller as `product`. */
  tokens: ReadonlyMap<string, TokenKind>;
  /** Accept unauthenticated requests as `product`. For local demos only. */
  insecureDev?: boolean;
  /** A misconception catalog briefs may use when the request names none. */
  misconceptions?: readonly Misconception[];
  /** Origins allowed to call the service from a browser. */
  corsOrigins?: readonly string[];
  /** The largest request body accepted. Default 5 MB. */
  maxBodyBytes?: number;
  /** Extra routes, e.g. the Phase 2 goal and transform routes. Return `undefined` when not matched. */
  routes?: readonly Route[];
}

/** A request as a route sees it. */
export interface RouteRequest {
  method: string;
  path: string[];
  query: URLSearchParams;
  body: unknown;
  actor: Actor;
}

/** A route: returns a response body, or `undefined` if it does not match. */
export type Route = (gate: TeacherGate, req: RouteRequest) => Promise<unknown | undefined>;

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const STATUS: Record<GateError["code"], number> = { validation: 400, forbidden: 403, "not-found": 404, conflict: 409, policy: 422, moderation: 422 };

function tokenKind(options: ServerOptions, header: string | undefined): TokenKind | undefined {
  const token = /^Bearer (.+)$/.exec(header ?? "")?.[1];
  if (token === undefined) return options.insecureDev ? "product" : undefined;
  const given = Buffer.from(token);
  for (const [known, kind] of options.tokens) {
    const k = Buffer.from(known);
    if (k.length === given.length && timingSafeEqual(k, given)) return kind;
  }
  return undefined;
}

function actorOf(kind: TokenKind, req: IncomingMessage): Actor {
  const id = String(req.headers["x-actor-id"] ?? "").slice(0, 128);
  if (kind === "agent") return { id: id || "agent", role: "agent", channel: "agent" };
  const role = String(req.headers["x-actor-role"] ?? "");
  if (role !== "teacher" && role !== "student" && role !== "service") throw new HttpError(400, "X-Actor-Role must be teacher, student or service.");
  if (id === "") throw new HttpError(400, "X-Actor-Id is required.");
  return { id, role, channel: "direct" };
}

async function readBody(req: IncomingMessage, max: number): Promise<unknown> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > max) throw new HttpError(413, "The request body is too large.");
    chunks.push(chunk as Buffer);
  }
  if (size === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "The request body is not JSON.");
  }
}

/** The core routes. `misconceptions` is the catalog briefs use when a request names none. */
export const coreRoutes = (misconceptions: readonly Misconception[] = []): Route => async (gate, { method, path, query, body, actor }) => {
  const opts = misconceptions;
  const [a, b, c, d] = path;
  if (a === "activities" && b !== undefined) {
    if (c === undefined && method === "PUT") return gate.putActivity(actor, { ...(body as object), id: b });
    if (c === undefined && method === "GET") return gate.getActivity(b);
    if (c === "preferences" && d === undefined && method === "GET") return gate.preferencesFor(b);
    if (c === "preferences" && d !== undefined && method === "PUT") return gate.setPreference(actor, b, d, Boolean((body as { enabled?: unknown })?.enabled));
  }
  if (a === "drafts") {
    if (b === undefined && method === "POST") return gate.draftFeedback(actor, body);
    if (b === undefined && method === "GET") {
      const filter: { activityId?: string; submissionId?: string } = {};
      if (query.get("activityId")) filter.activityId = query.get("activityId")!;
      if (query.get("submissionId")) filter.submissionId = query.get("submissionId")!;
      return gate.listDrafts(actor, filter);
    }
    if (b !== undefined && c === undefined && method === "GET") return gate.getDraft(actor, b);
    if (b !== undefined && c === "decisions" && method === "POST") return gate.decide(actor, b, body);
    if (b !== undefined && c === "release" && method === "POST") return gate.release(actor, b);
  }
  if (a === "submissions" && b !== undefined && c === "student-view" && method === "GET") {
    const prefer: { language?: string; readingLevel?: number } = {};
    if (query.get("language")) prefer.language = query.get("language")!;
    if (query.get("readingLevel")) prefer.readingLevel = Number(query.get("readingLevel"));
    return gate.studentView(actor, b, Object.keys(prefer).length === 0 ? undefined : prefer);
  }
  if (a === "briefs") {
    if (b === undefined && method === "POST") {
      const { classSet, misconceptions } = (body ?? {}) as { classSet?: unknown; misconceptions?: Misconception[] };
      return draftMisconceptionBrief(gate, actor, classSet, misconceptions ?? opts);
    }
    if (b !== undefined && c === undefined && method === "GET") return getBrief(gate, actor, b);
    if (b !== undefined && c === "decisions" && method === "POST") return decideMapping(gate, actor, b, body);
    if (b !== undefined && c === "save" && method === "POST") return saveBrief(gate, actor, b);
  }
  if (a === "audit" && b === undefined && method === "GET") return gate.auditLog(actor);
  return undefined;
};

/** Creates the HTTP server. Routes live under `/v1/`; `GET /healthz` needs no token. */
export function createServer(gate: TeacherGate, options: ServerOptions): Server {
  const routes = [coreRoutes(options.misconceptions), ...(options.routes ?? [])];
  return createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    const origin = req.headers.origin;
    if (origin !== undefined && options.corsOrigins?.includes(origin)) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("access-control-allow-headers", "authorization, content-type, x-actor-id, x-actor-role");
      res.setHeader("access-control-allow-methods", "GET, POST, PUT, OPTIONS");
      res.setHeader("vary", "origin");
    }
    const send = (status: number, value: unknown) => {
      res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify(value));
    };
    try {
      if (req.method === "OPTIONS") return void res.writeHead(204).end();
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/healthz") return send(200, { ok: true, model: gate.model.label });
      const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
      if (parts[0] !== "v1") throw new HttpError(404, "Not found.");
      const kind = tokenKind(options, req.headers.authorization);
      if (kind === undefined) throw new HttpError(401, "A valid bearer token is required.");
      const actor = actorOf(kind, req);
      const body = await readBody(req, options.maxBodyBytes ?? 5 * 1024 * 1024);
      for (const route of routes) {
        const result = await route(gate, { method: req.method ?? "GET", path: parts.slice(1), query: url.searchParams, body, actor });
        if (result !== undefined) return send(req.method === "POST" ? 201 : 200, result);
      }
      throw new HttpError(404, "Not found.");
    } catch (error) {
      if (error instanceof GateError) return send(STATUS[error.code], { error: error.code, message: error.message });
      if (error instanceof HttpError) return send(error.status, { error: "http", message: error.message });
      // Never echo internals, which could include student text.
      return send(500, { error: "internal", message: "Internal error." });
    }
  });
}
