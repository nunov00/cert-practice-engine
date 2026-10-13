// Anonymous feedback (docs/feedback.md). Pure logic, so it is testable without
// Cloudflare: the API route passes in the D1 binding, the GitHub writer and the
// request data.
//
// Privacy: we keep the message, a category, the page it was sent from (path
// only) and the time. Never a name, email, IP address, user agent or cookie.
// Each message becomes one file in the owner's PRIVATE repo (FEEDBACK_REPO);
// D1 only holds it briefly as an outbox until that write succeeds, plus the
// anonymous daily counters. Nothing goes to the public repo.

export const CATEGORIES = [
  { id: "idea", label: "Idea or suggestion" },
  { id: "problem", label: "Something isn't working" },
  { id: "question", label: "A question looks wrong" },
  { id: "other", label: "Something else" },
] as const;
export type Category = (typeof CATEGORIES)[number]["id"];

export const MIN_MESSAGE = 5;
export const MAX_MESSAGE = 2000;
const MAX_PAGE = 200;
/** Whole-site cap per UTC day. Keeps D1 writes tiny even under abuse (Free: 100,000 a day per account). */
export const DAILY_CAP = 200;
/** Messages one visitor can send per UTC day (owner's choice, 2026-10-13). */
export const VISITOR_DAILY_LIMIT = 5;
/** Outbox rows pushed to the private repo per request. */
export const FLUSH_BATCH = 10;

export interface FeedbackInput {
  category: Category;
  message: string;
  page: string | null;
}

/** A message waiting in the D1 outbox. */
export interface FeedbackRow {
  id: number;
  created_at: string;
  category: Category;
  message: string;
  page: string | null;
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
  const visitor = await visitorId(db, day, ip);
  // Outbox rows leave once filed, so the site-wide count comes from today's counters.
  const count = await db
    .prepare("SELECT COALESCE(SUM(n), 0) AS n FROM feedback_quota WHERE day = ?")
    .bind(day)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= DAILY_CAP) return "daily-cap";
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

// ---- Filing into the private repo ----

/** Writes one file; resolves true once it is stored. */
export type FileWriter = (path: string, content: string, commitMessage: string) => Promise<boolean>;

/** `inbox/2026-10-13/20261013T100000Z-<id>.md`: sorts by time, unique per message. */
export function feedbackPath(row: Pick<FeedbackRow, "id" | "created_at">): string {
  const stamp = row.created_at.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return `inbox/${row.created_at.slice(0, 10)}/${stamp}-${row.id}.md`;
}

export function feedbackFile(row: FeedbackRow): string {
  const label = CATEGORIES.find((c) => c.id === row.category)?.label ?? row.category;
  return [
    "---",
    `received: ${row.created_at}`,
    `category: ${row.category} # ${label}`,
    `page: ${row.page ?? "none"}`,
    "---",
    "",
    row.message,
    "",
  ].join("\n");
}

/**
 * Files the oldest outbox messages into the private repo and removes each from
 * D1 once stored. Failures stay in the outbox and are retried on the next send.
 */
export async function flushOutbox(db: Db, write: FileWriter, limit = FLUSH_BATCH): Promise<number> {
  await ensureSchema(db);
  const { results } = await db
    .prepare("SELECT id, created_at, category, message, page FROM feedback ORDER BY id LIMIT ?")
    .bind(limit)
    .all<FeedbackRow>();
  let filed = 0;
  for (const row of results) {
    let ok = false;
    try {
      ok = await write(feedbackPath(row), feedbackFile(row), `Feedback: ${row.category}`);
    } catch {
      ok = false;
    }
    if (!ok) break;
    await db.prepare("DELETE FROM feedback WHERE id = ?").bind(row.id).run();
    filed++;
  }
  return filed;
}
