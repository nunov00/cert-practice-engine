import { test } from "node:test";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import assert from "node:assert/strict";
import {
  DAILY_CAP,
  VISITOR_DAILY_LIMIT,
  cleanPage,
  parseFeedback,
  resetSchemaCache,
  saveFeedback,
  type Db,
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

test("messages stay in D1, newest readable first, until an agent deletes them", async () => {
  resetSchemaCache();
  const { db, sqlite } = sqliteDb();
  const now = new Date("2026-10-13T10:15:00.123Z");
  await saveFeedback(db, { category: "idea", message: "first one", page: "/exams/cissp" }, now, "1.1.1.1");
  await saveFeedback(db, { category: "problem", message: "second one", page: null }, now, "1.1.1.2");
  // The review query in docs/feedback.md.
  const rows = sqlite
    .prepare("SELECT id, created_at, category, page, message FROM feedback WHERE status = 'new' ORDER BY id DESC")
    .all()
    .map((r) => ({ ...r }));
  assert.deepEqual(rows, [
    { id: 2, created_at: "2026-10-13T10:15:00.123Z", category: "problem", page: null, message: "second one" },
    { id: 1, created_at: "2026-10-13T10:15:00.123Z", category: "idea", page: "/exams/cissp", message: "first one" },
  ]);
});

test("the site-wide cap still counts messages already deleted after review", async () => {
  resetSchemaCache();
  const { db, sqlite } = sqliteDb();
  const now = new Date("2026-10-13T10:00:00Z");
  for (let i = 0; i < DAILY_CAP; i++) {
    await saveFeedback(db, { category: "idea", message: `idea ${i}`, page: null }, now, `10.0.${i >> 8}.${i & 255}`);
    if (i % 50 === 0) sqlite.exec("DELETE FROM feedback");
  }
  sqlite.exec("DELETE FROM feedback");
  assert.equal(await saveFeedback(db, { category: "idea", message: "one too many", page: null }, now, "10.9.9.9"), "daily-cap");
});
