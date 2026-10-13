import { test } from "node:test";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import assert from "node:assert/strict";
import type { Db, Stmt } from "../src/lib/feedback.ts";
import {
  buildReport,
  countStat,
  finished,
  parseStat,
  periodStart,
  readStats,
  resetStatsSchemaCache,
  started,
  type KnownExams,
} from "../src/lib/stats.ts";

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
  resetStatsSchemaCache();
  return { db, sqlite };
}

const known: KnownExams = new Map([["aair", new Set(["d1", "d2"])]]);

test("parseStat accepts known exams and domains only", () => {
  assert.deepEqual(parseStat({ event: "exam_open", exam: "aair" }, known), { event: "exam_open", exam: "aair", domain: "" });
  assert.deepEqual(parseStat({ event: "drill_start", exam: "aair", domain: "d2" }, known), {
    event: "drill_start",
    exam: "aair",
    domain: "d2",
  });
  assert.deepEqual(parseStat({ event: "drill_start", exam: "aair" }, known), { event: "drill_start", exam: "aair", domain: "" });
  assert.equal(parseStat({ event: "exam_open", exam: "nope" }, known), null);
  assert.equal(parseStat({ event: "drill_start", exam: "aair", domain: "d9" }, known), null);
  assert.equal(parseStat({ event: "mock_start", exam: "aair", domain: "d1" }, known), null);
  assert.equal(parseStat({ event: "pageview", exam: "aair" }, known), null);
  assert.equal(parseStat(null, known), null);
});

test("countStat keeps daily totals only, and stops at the site-wide cap", async () => {
  const { db, sqlite } = sqliteDb();
  const now = new Date("2026-10-13T10:00:00Z");
  const input = { event: "drill_start" as const, exam: "aair", domain: "d1" };
  assert.equal(await countStat(db, input, now, 3), "counted");
  assert.equal(await countStat(db, input, now, 3), "counted");
  assert.equal(await countStat(db, { ...input, event: "exam_open", domain: "" }, now, 3), "counted");
  assert.equal(await countStat(db, input, now, 3), "daily-cap");
  assert.deepEqual(sqlite.prepare("SELECT * FROM stats_daily ORDER BY event").all().map((r) => ({ ...r })), [
    { day: "2026-10-13", event: "drill_start", exam: "aair", domain: "d1", n: 2 },
    { day: "2026-10-13", event: "exam_open", exam: "aair", domain: "", n: 1 },
  ]);
  // A new day starts a new cap.
  assert.equal(await countStat(db, input, new Date("2026-10-14T00:00:01Z"), 3), "counted");
  assert.equal((await readStats(db, "2026-10-14")).length, 1);
  assert.equal((await readStats(db, null)).length, 3);
});

test("buildReport totals, ranks and lists days newest first", () => {
  const r = buildReport(
    [
      { day: "2026-10-12", event: "exam_open", exam: "cissp", domain: "", n: 1 },
      { day: "2026-10-13", event: "exam_open", exam: "aair", domain: "", n: 4 },
      { day: "2026-10-13", event: "drill_start", exam: "aair", domain: "d1", n: 3 },
      { day: "2026-10-13", event: "drill_finish", exam: "aair", domain: "d1", n: 2 },
      { day: "2026-10-13", event: "mock_start", exam: "aair", domain: "", n: 1 },
    ],
    null,
  );
  assert.equal(r.totals.exam_open, 5);
  assert.equal(started(r.totals), 4);
  assert.equal(finished(r.totals), 2);
  assert.deepEqual(r.exams.map((e) => e.exam), ["aair", "cissp"]);
  assert.deepEqual(r.domains, [{ exam: "aair", domain: "d1", counts: { drill_start: 3, drill_finish: 2 } }]);
  assert.deepEqual(r.days.map((d) => d.day), ["2026-10-13", "2026-10-12"]);
});

test("periodStart", () => {
  const now = new Date("2026-10-13T23:00:00Z");
  assert.equal(periodStart(7, now), "2026-10-07");
  assert.equal(periodStart(null, now), null);
});
