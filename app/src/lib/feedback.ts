// Anonymous feedback (docs/feedback.md). Pure logic, so it is testable without
// Cloudflare: the API routes pass in the D1 binding and the request data.
//
// Privacy: we store the message, a category, the page it was sent from (path
// only) and the date. Never a name, email, IP address, user agent or cookie.
// Feedback is private to the owner: it lives only in D1, is never committed to
// the (public) repo, and is readable only with the owner's token.

export const CATEGORIES = [
  { id: "idea", label: "Idea or suggestion" },
  { id: "problem", label: "Something isn't working" },
  { id: "question", label: "A question looks wrong" },
  { id: "other", label: "Something else" },
] as const;
export type Category = (typeof CATEGORIES)[number]["id"];

export const STATUSES = ["new", "considering", "done", "dismissed"] as const;
export type Status = (typeof STATUSES)[number];

export const MIN_MESSAGE = 5;
export const MAX_MESSAGE = 2000;
const MAX_PAGE = 200;
/** Whole-site cap per UTC day. Keeps D1 writes tiny even under abuse (Free: 100,000 a day per account). */
export const DAILY_CAP = 200;
/** Messages one visitor can send per UTC day (owner's choice, 2026-10-13). */
export const VISITOR_DAILY_LIMIT = 5;
/** Shortest owner token we accept; shorter ones are treated as not configured. */
export const MIN_TOKEN = 24;

export interface FeedbackInput {
  category: Category;
  message: string;
  page: string | null;
}

export interface FeedbackRow {
  id: number;
  created_at: string;
  category: Category;
  message: string;
  page: string | null;
  status: Status;
}

export type Parsed = { ok: true; value: FeedbackInput } | { ok: true; spam: true } | { ok: false; error: string };

/** Validates a submission. A filled honeypot field is reported as spam so the caller can drop it quietly. */
export function parseFeedback(body: unknown): Parsed {
  if (!body || typeof body !== "object") return { ok: false, error: "Send a JSON object." };
  const b = body as Record<string, unknown>;
  if (typeof b.website === "string" && b.website.trim() !== "") return { ok: true, spam: true };

  const category = CATEGORIES.find((c) => c.id === b.category)?.id;
  if (!category) return { ok: false, error: "Pick a category." };

  const message = typeof b.message === "string" ? b.message.replace(/\r\n/g, "\n").trim() : "";
  if (message.length < MIN_MESSAGE) return { ok: false, error: "Write a few words of feedback." };
  if (message.length > MAX_MESSAGE) return { ok: false, error: `Keep it under ${MAX_MESSAGE} characters.` };

  return { ok: true, value: { category, message, page: cleanPage(b.page) } };
}

/** Keeps a same-site path only: no origin, query string or fragment, which could carry personal data. */
export function cleanPage(page: unknown): string | null {
  if (typeof page !== "string" || !page.startsWith("/") || page.startsWith("//")) return null;
  const path = page.split(/[?#]/)[0] ?? "";
  if (!/^\/[\w\-./]*$/.test(path)) return null;
  return path.slice(0, MAX_PAGE);
}

// ---- Storage (Cloudflare D1) ----

/** The slice of D1's API we use, so tests can pass a fake. */
export interface Db {
  prepare(sql: string): Stmt;
  batch(statements: Stmt[]): Promise<unknown>;
}
export interface Stmt {
  bind(...values: unknown[]): Stmt;
  run(): Promise<{ meta?: { changes?: number } }>;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    day TEXT NOT NULL,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    page TEXT,
    status TEXT NOT NULL DEFAULT 'new'
  )`,
  `CREATE INDEX IF NOT EXISTS feedback_day ON feedback (day)`,
  // Per-visitor daily limit without keeping IP addresses: a visitor is
  // SHA-256(today's random salt + IP). Both tables only ever hold today's rows;
  // once yesterday's salt is deleted, yesterday's hashes can't be linked to anyone.
  `CREATE TABLE IF NOT EXISTS feedback_salt (day TEXT PRIMARY KEY, salt TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS feedback_quota (
    day TEXT NOT NULL,
    visitor TEXT NOT NULL,
    n INTEGER NOT NULL,
    PRIMARY KEY (day, visitor)
  )`,
];

// Created on first use, so a deploy needs no migration step (once per isolate).
let schemaReady: Promise<unknown> | null = null;
export function ensureSchema(db: Db): Promise<unknown> {
  schemaReady ??= db.batch(SCHEMA.map((s) => db.prepare(s))).catch((err) => {
    schemaReady = null;
    throw err;
  });
  return schemaReady;
}

/** For tests: forget that the schema was created. */
export function resetSchemaCache() {
  schemaReady = null;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes: number): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Today's anonymous visitor id. The IP goes into the hash and nowhere else. */
async function visitorId(db: Db, day: string, ip: string): Promise<string> {
  await db.batch([
    db.prepare("DELETE FROM feedback_salt WHERE day <> ?").bind(day),
    db.prepare("DELETE FROM feedback_quota WHERE day <> ?").bind(day),
    db.prepare("INSERT OR IGNORE INTO feedback_salt (day, salt) VALUES (?, ?)").bind(day, randomHex(32)),
  ]);
  const row = await db.prepare("SELECT salt FROM feedback_salt WHERE day = ?").bind(day).first<{ salt: string }>();
  return sha256Hex(`${row?.salt ?? ""}:${ip}`);
}

export type SaveResult = "saved" | "daily-cap" | "visitor-limit";

/** `ip` is used only to derive today's anonymous visitor id; it is never stored. */
export async function saveFeedback(db: Db, input: FeedbackInput, now: Date, ip: string): Promise<SaveResult> {
  await ensureSchema(db);
  const iso = now.toISOString();
  const day = iso.slice(0, 10);
  const count = await db.prepare("SELECT COUNT(*) AS n FROM feedback WHERE day = ?").bind(day).first<{ n: number }>();
  if ((count?.n ?? 0) >= DAILY_CAP) return "daily-cap";
  const visitor = await visitorId(db, day, ip);
  // Counts and checks in one statement: no row back means the visitor is at the limit.
  const used = await db
    .prepare(
      `INSERT INTO feedback_quota (day, visitor, n) VALUES (?, ?, 1)
       ON CONFLICT (day, visitor) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n`,
    )
    .bind(day, visitor, VISITOR_DAILY_LIMIT)
    .first<{ n: number }>();
  if (!used) return "visitor-limit";
  await db
    .prepare("INSERT INTO feedback (created_at, day, category, message, page) VALUES (?, ?, ?, ?, ?)")
    .bind(iso, day, input.category, input.message, input.page)
    .run();
  return "saved";
}

export async function listFeedback(db: Db, limit = 500): Promise<FeedbackRow[]> {
  await ensureSchema(db);
  const { results } = await db
    .prepare("SELECT id, created_at, category, message, page, status FROM feedback ORDER BY id DESC LIMIT ?")
    .bind(limit)
    .all<FeedbackRow>();
  return results;
}

export async function setStatus(db: Db, id: number, status: Status): Promise<boolean> {
  await ensureSchema(db);
  const r = await db.prepare("UPDATE feedback SET status = ? WHERE id = ?").bind(status, id).run();
  return (r.meta?.changes ?? 0) > 0;
}

export async function deleteFeedback(db: Db, id: number): Promise<boolean> {
  await ensureSchema(db);
  const r = await db.prepare("DELETE FROM feedback WHERE id = ?").bind(id).run();
  return (r.meta?.changes ?? 0) > 0;
}

export function isStatus(s: unknown): s is Status {
  return typeof s === "string" && (STATUSES as readonly string[]).includes(s);
}

// ---- Owner access ----

/** Constant-time check of `Authorization: Bearer <token>` against the configured secret. */
export async function tokenMatches(header: string | null, expected: string | undefined): Promise<boolean> {
  if (!expected || expected.length < MIN_TOKEN || !header?.startsWith("Bearer ")) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(header.slice(7))),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

/** True when the header matches any of the keys (each compared in constant time). */
export async function anyTokenMatches(header: string | null, keys: string[]): Promise<boolean> {
  const results = await Promise.all(keys.map((k) => tokenMatches(header, k)));
  return results.includes(true);
}

export function toCsv(rows: FeedbackRow[]): string {
  const cell = (v: unknown) => {
    let s = v == null ? "" : String(v);
    // Stop spreadsheet apps treating a message as a formula.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["id", "created_at", "category", "status", "page", "message"] as const;
  return [head.join(","), ...rows.map((r) => head.map((k) => cell(r[k])).join(","))].join("\n") + "\n";
}
