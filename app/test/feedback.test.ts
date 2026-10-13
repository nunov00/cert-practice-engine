import { test } from "node:test";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import assert from "node:assert/strict";
import {
  DAILY_CAP,
  VISITOR_DAILY_LIMIT,
  cleanPage,
  deleteFeedback,
  listFeedback,
  parseFeedback,
  resetSchemaCache,
  saveFeedback,
  setStatus,
  toCsv,
  tokenMatches,
  anyTokenMatches,
  type Db,
  type FeedbackRow,
  type Stmt,
} from "../src/lib/feedback.ts";

// D1 stand-in backed by Node's built-in SQLite, so the real SQL runs in tests.
function sqliteDb() {
  const sqlite = new DatabaseSync(":memory:");
  const stmt = (q: string, args: unknown[] = []): Stmt => ({
    bind: (...v) => stmt(q, v),
    async run() {
      const r = sqlite.prepare(q).run(...(args as SQLInputValue[]));
      return { meta: { changes: Number(r.changes) } };
    },
    async all<T>() {
      return { results: sqlite.prepare(q).all(...(args as SQLInputValue[])) as T[] };
    },
    async first<T>() {
      return (sqlite.prepare(q).get(...(args as SQLInputValue[])) ?? null) as T | null;
    },
  });
  const db: Db = {
    prepare: (q) => stmt(q),
    async batch(list) {
      for (const s of list) await s.run();
      return [];
    },
  };
  return { db, sqlite };
}

test("parseFeedback accepts a normal message and keeps only the page path", () => {
  const r = parseFeedback({ category: "idea", message: "  More AAIR questions please \r\n ", page: "/exams/aair?x=1#top" });
  assert.deepEqual(r, { ok: true, value: { category: "idea", message: "More AAIR questions please", page: "/exams/aair" } });
});

test("parseFeedback rejects bad input and flags the honeypot", () => {
  assert.equal(parseFeedback(null).ok, false);
  assert.equal(parseFeedback({ category: "nope", message: "hello there" }).ok, false);
  assert.equal(parseFeedback({ category: "idea", message: "hi" }).ok, false);
  assert.equal(parseFeedback({ category: "idea", message: "x".repeat(2001) }).ok, false);
  assert.deepEqual(parseFeedback({ category: "idea", message: "buy now", website: "spam.example" }), { ok: true, spam: true });
});

test("cleanPage drops anything that isn't a same-site path", () => {
  assert.equal(cleanPage("https://evil.example/x"), null);
  assert.equal(cleanPage("//evil.example/x"), null);
  assert.equal(cleanPage("/a b"), null);
  assert.equal(cleanPage(42), null);
  assert.equal(cleanPage("/exams/cissp/drill/d1"), "/exams/cissp/drill/d1");
});

test("saveFeedback stores no personal fields", async () => {
  resetSchemaCache();
  const { db, sqlite } = sqliteDb();
  const now = new Date("2026-10-13T10:00:00Z");
  assert.equal(await saveFeedback(db, { category: "problem", message: "Timer is off", page: null }, now, "203.0.113.7"), "saved");
  const cols = (sqlite.prepare("PRAGMA table_info(feedback)").all() as { name: string }[]).map((c) => c.name).sort();
  assert.deepEqual(cols, ["category", "created_at", "day", "id", "message", "page", "status"]);
  const dump = JSON.stringify([
    sqlite.prepare("SELECT * FROM feedback").all(),
    sqlite.prepare("SELECT * FROM feedback_quota").all(),
    sqlite.prepare("SELECT * FROM feedback_salt").all(),
  ]);
  assert.ok(!dump.includes("203.0.113.7"), "the IP address is never stored");
});

test("each visitor gets 5 messages a day; others are unaffected; it resets the next day", async () => {
  resetSchemaCache();
  const { db, sqlite } = sqliteDb();
  const day1 = new Date("2026-10-13T10:00:00Z");
  const msg = { category: "idea" as const, message: "an idea", page: null };
  for (let i = 0; i < VISITOR_DAILY_LIMIT; i++) assert.equal(await saveFeedback(db, msg, day1, "198.51.100.1"), "saved");
  assert.equal(await saveFeedback(db, msg, day1, "198.51.100.1"), "visitor-limit");
  assert.equal(await saveFeedback(db, msg, day1, "198.51.100.2"), "saved");
  const day2 = new Date("2026-10-14T00:00:01Z");
  assert.equal(await saveFeedback(db, msg, day2, "198.51.100.1"), "saved");
  // Yesterday's salt and counters are gone, so yesterday's visitor ids can't be linked to anyone.
  assert.deepEqual(sqlite.prepare("SELECT DISTINCT day FROM feedback_salt UNION SELECT DISTINCT day FROM feedback_quota").all().map((r) => ({ ...r })), [{ day: "2026-10-14" }]);
});

test("the whole site stops at the daily cap", async () => {
  resetSchemaCache();
  const { db } = sqliteDb();
  const now = new Date("2026-10-13T10:00:00Z");
  for (let i = 0; i < DAILY_CAP; i++) {
    assert.equal(await saveFeedback(db, { category: "idea", message: `idea ${i}`, page: null }, now, `10.0.${i >> 8}.${i & 255}`), "saved");
  }
  assert.equal(await saveFeedback(db, { category: "idea", message: "one too many", page: null }, now, "10.9.9.9"), "daily-cap");
});

test("owner can list, change status and delete", async () => {
  resetSchemaCache();
  const { db } = sqliteDb();
  const now = new Date("2026-10-13T10:00:00Z");
  await saveFeedback(db, { category: "idea", message: "first one", page: null }, now, "1.1.1.1");
  await saveFeedback(db, { category: "idea", message: "second one", page: "/" }, now, "1.1.1.1");
  const list = await listFeedback(db);
  assert.deepEqual(list.map((r) => r.message), ["second one", "first one"]);
  assert.equal(await setStatus(db, list[0]!.id, "considering"), true);
  assert.equal((await listFeedback(db))[0]!.status, "considering");
  assert.equal(await deleteFeedback(db, list[1]!.id), true);
  assert.equal(await deleteFeedback(db, 999), false);
  assert.equal((await listFeedback(db)).length, 1);
});

test("tokenMatches needs the exact, long-enough secret", async () => {
  const secret = "a".repeat(32);
  assert.equal(await tokenMatches(`Bearer ${secret}`, secret), true);
  assert.equal(await tokenMatches(`Bearer ${secret}x`, secret), false);
  assert.equal(await tokenMatches(secret, secret), false);
  assert.equal(await tokenMatches(null, secret), false);
  assert.equal(await tokenMatches("Bearer short", "short"), false, "short secrets count as not configured");
  assert.equal(await tokenMatches("Bearer ", undefined), false);
});

test("toCsv quotes fields and defuses spreadsheet formulas", () => {
  const csv = toCsv([
    { id: 1, created_at: "2026-10-13T10:00:00.000Z", category: "idea", status: "new", page: null, message: '=HYPERLINK("x")\nline, two' },
  ]);
  assert.equal(csv, 'id,created_at,category,status,page,message\n1,2026-10-13T10:00:00.000Z,idea,new,,"\'=HYPERLINK(""x"")\nline, two"\n');
});

test("review summary lists new messages by default", async () => {
  const { summarise } = await import("../scripts/feedback.ts");
  const rows: FeedbackRow[] = [
    { id: 2, created_at: "2026-10-13T10:00:00Z", category: "idea", message: "More drills\nplease", page: "/", status: "new" },
    { id: 1, created_at: "2026-10-12T10:00:00Z", category: "problem", message: "Old one", page: null, status: "done" },
  ];
  assert.equal(summarise(rows, false), "# Feedback (1 new, 2 stored)\n\n- **#2** 2026-10-13 · Idea or suggestion · new · /\n  More drills\n  please");
  assert.match(summarise(rows, true), /2 in total/);
});

test("anyTokenMatches accepts any configured agent key and nothing else", async () => {
  const keys = ["c".repeat(30), "x".repeat(30)];
  assert.equal(await anyTokenMatches(`Bearer ${"x".repeat(30)}`, keys), true);
  assert.equal(await anyTokenMatches(`Bearer ${"y".repeat(30)}`, keys), false);
  assert.equal(await anyTokenMatches(`Bearer ${"x".repeat(30)}`, []), false);
});
