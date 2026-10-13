import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_CAP,
  cleanPage,
  deleteFeedback,
  listFeedback,
  parseFeedback,
  resetSchemaCache,
  saveFeedback,
  setStatus,
  toCsv,
  tokenMatches,
  type Db,
  type FeedbackRow,
  type Stmt,
} from "../src/lib/feedback.ts";

// Small in-memory stand-in for D1 that understands the statements feedback.ts runs.
function fakeDb() {
  const rows: (FeedbackRow & { day: string })[] = [];
  let nextId = 1;
  const sql: string[] = [];
  const stmt = (q: string, args: unknown[] = []): Stmt => ({
    bind: (...v) => stmt(q, v),
    async run() {
      sql.push(q);
      if (q.startsWith("INSERT")) {
        const [created_at, day, category, message, page] = args as string[];
        rows.push({ id: nextId++, created_at: created_at!, day: day!, category: category as never, message: message!, page: page ?? null, status: "new" });
        return { meta: { changes: 1 } };
      }
      if (q.startsWith("UPDATE")) {
        const r = rows.find((x) => x.id === args[1]);
        if (r) r.status = args[0] as never;
        return { meta: { changes: r ? 1 : 0 } };
      }
      if (q.startsWith("DELETE")) {
        const i = rows.findIndex((x) => x.id === args[0]);
        if (i >= 0) rows.splice(i, 1);
        return { meta: { changes: i >= 0 ? 1 : 0 } };
      }
      return {};
    },
    async all<T>() {
      sql.push(q);
      return { results: [...rows].reverse().slice(0, args[0] as number).map(({ day: _, ...r }) => r) as T[] };
    },
    async first<T>() {
      sql.push(q);
      return { n: rows.filter((r) => r.day === args[0]).length } as T;
    },
  });
  const db: Db = {
    prepare: (q) => stmt(q),
    async batch(list) {
      for (const s of list) await s.run();
      return [];
    },
  };
  return { db, rows, sql };
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

test("saveFeedback stores no personal fields and stops at the daily cap", async () => {
  resetSchemaCache();
  const { db, rows, sql } = fakeDb();
  const now = new Date("2026-10-13T10:00:00Z");
  assert.equal(await saveFeedback(db, { category: "problem", message: "Timer is off", page: null }, now), "saved");
  assert.ok(sql[0]!.includes("CREATE TABLE IF NOT EXISTS feedback"));
  assert.deepEqual(Object.keys(rows[0]!).sort(), ["category", "created_at", "day", "id", "message", "page", "status"]);
  for (let i = 1; i < DAILY_CAP; i++) await saveFeedback(db, { category: "idea", message: `idea ${i}`, page: null }, now);
  assert.equal(await saveFeedback(db, { category: "idea", message: "one too many", page: null }, now), "daily-cap");
  assert.equal(await saveFeedback(db, { category: "idea", message: "next day", page: null }, new Date("2026-10-14T00:00:01Z")), "saved");
});

test("owner can list, change status and delete", async () => {
  resetSchemaCache();
  const { db } = fakeDb();
  const now = new Date("2026-10-13T10:00:00Z");
  await saveFeedback(db, { category: "idea", message: "first one", page: null }, now);
  await saveFeedback(db, { category: "idea", message: "second one", page: "/" }, now);
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
