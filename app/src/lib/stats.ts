// Anonymous usage counts for the owner's private stats page (docs/analytics.md).
// Pure logic, so it is testable without Cloudflare: the API route passes in the
// D1 binding and the request data.
//
// Privacy: we keep only daily totals per event, exam and domain. No visitor id,
// IP address, user agent, cookie or timestamp finer than the UTC day. The
// browser itself makes sure it counts each item at most once a day (lib/track.ts).

import type { Db } from "./feedback";

export const EVENTS = [
  { id: "exam_open", label: "Exam page opens" },
  { id: "drill_start", label: "Drills started" },
  { id: "drill_finish", label: "Drills finished" },
  { id: "quick_start", label: "Quick 10 tests started" },
  { id: "quick_finish", label: "Quick 10 tests finished" },
  { id: "mock_start", label: "Mock exams started" },
  { id: "mock_finish", label: "Mock exams finished" },
  { id: "missed_start", label: "Wrong-answer tests started" },
  { id: "missed_finish", label: "Wrong-answer tests finished" },
] as const;
export type StatEvent = (typeof EVENTS)[number]["id"];

/** Events that may name one domain (a domain drill or wrong-answers test); without one they cover all domains. */
const MAY_DOMAIN = new Set<StatEvent>(["drill_start", "drill_finish", "missed_start", "missed_finish"]);

/** Whole-site cap on counted events per UTC day. Keeps D1 writes small even under abuse (Free: 100,000 a day per account). */
export const STATS_DAILY_CAP = 5000;

export interface StatInput {
  event: StatEvent;
  exam: string;
  /** "" when the event isn't about one domain. */
  domain: string;
}

/** Which exams and domains exist, so junk can't create rows. */
export type KnownExams = ReadonlyMap<string, ReadonlySet<string>>;

export function parseStat(body: unknown, known: KnownExams): StatInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const event = EVENTS.find((e) => e.id === b.event)?.id;
  if (!event || typeof b.exam !== "string") return null;
  const domains = known.get(b.exam);
  if (!domains) return null;
  const domain = typeof b.domain === "string" ? b.domain : "";
  if (domain !== "" && (!MAY_DOMAIN.has(event) || !domains.has(domain))) return null;
  return { event, exam: b.exam, domain };
}

// ---- Storage (Cloudflare D1, the same database as feedback) ----

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS stats_daily (
    day TEXT NOT NULL,
    event TEXT NOT NULL,
    exam TEXT NOT NULL,
    domain TEXT NOT NULL DEFAULT '',
    n INTEGER NOT NULL,
    PRIMARY KEY (day, event, exam, domain)
  )`,
  `CREATE TABLE IF NOT EXISTS stats_cap (day TEXT PRIMARY KEY, n INTEGER NOT NULL)`,
];

let schemaReady: Promise<unknown> | null = null;
function ensureSchema(db: Db): Promise<unknown> {
  schemaReady ??= db.batch(SCHEMA.map((s) => db.prepare(s))).catch((err) => {
    schemaReady = null;
    throw err;
  });
  return schemaReady;
}

/** For tests: forget that the schema was created. */
export function resetStatsSchemaCache() {
  schemaReady = null;
}

export type CountResult = "counted" | "daily-cap";

export async function countStat(db: Db, input: StatInput, now: Date, cap = STATS_DAILY_CAP): Promise<CountResult> {
  await ensureSchema(db);
  const day = now.toISOString().slice(0, 10);
  // Counts and checks the site-wide cap in one statement: no row back means today is full.
  const used = await db
    .prepare(
      `INSERT INTO stats_cap (day, n) VALUES (?, 1)
       ON CONFLICT (day) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n`,
    )
    .bind(day, cap)
    .first<{ n: number }>();
  if (!used) return "daily-cap";
  await db
    .prepare(
      `INSERT INTO stats_daily (day, event, exam, domain, n) VALUES (?, ?, ?, ?, 1)
       ON CONFLICT (day, event, exam, domain) DO UPDATE SET n = n + 1`,
    )
    .bind(day, input.event, input.exam, input.domain)
    .run();
  return "counted";
}

export interface StatRow {
  day: string;
  event: StatEvent;
  exam: string;
  domain: string;
  n: number;
}

/** Rows since `fromDay` (inclusive), or all of them. */
export async function readStats(db: Db, fromDay: string | null): Promise<StatRow[]> {
  await ensureSchema(db);
  const q = fromDay
    ? db.prepare("SELECT day, event, exam, domain, n FROM stats_daily WHERE day >= ?").bind(fromDay)
    : db.prepare("SELECT day, event, exam, domain, n FROM stats_daily");
  return (await q.all<StatRow>()).results;
}

// ---- Report for the stats page ----

export type Counts = Partial<Record<StatEvent, number>>;

export interface StatsReport {
  from: string | null;
  totals: Counts;
  exams: { exam: string; counts: Counts }[];
  domains: { exam: string; domain: string; counts: Counts }[];
  /** Days with any activity, newest first. */
  days: { day: string; counts: Counts }[];
}

const STARTS: StatEvent[] = ["drill_start", "quick_start", "mock_start", "missed_start"];
const FINISHES: StatEvent[] = ["drill_finish", "quick_finish", "mock_finish", "missed_finish"];

export const started = (c: Counts) => STARTS.reduce((s, e) => s + (c[e] ?? 0), 0);
export const finished = (c: Counts) => FINISHES.reduce((s, e) => s + (c[e] ?? 0), 0);

function add(c: Counts, e: StatEvent, n: number) {
  c[e] = (c[e] ?? 0) + n;
}

export function buildReport(rows: StatRow[], from: string | null): StatsReport {
  const totals: Counts = {};
  const exams = new Map<string, Counts>();
  const domains = new Map<string, { exam: string; domain: string; counts: Counts }>();
  const days = new Map<string, Counts>();
  for (const r of rows) {
    add(totals, r.event, r.n);
    if (!exams.has(r.exam)) exams.set(r.exam, {});
    add(exams.get(r.exam)!, r.event, r.n);
    if (r.domain) {
      const key = `${r.exam}/${r.domain}`;
      if (!domains.has(key)) domains.set(key, { exam: r.exam, domain: r.domain, counts: {} });
      add(domains.get(key)!.counts, r.event, r.n);
    }
    if (!days.has(r.day)) days.set(r.day, {});
    add(days.get(r.day)!, r.event, r.n);
  }
  const busy = (c: Counts) => (c.exam_open ?? 0) + started(c);
  return {
    from,
    totals,
    exams: [...exams].map(([exam, counts]) => ({ exam, counts })).sort((a, b) => busy(b.counts) - busy(a.counts)),
    domains: [...domains.values()].sort((a, b) => started(b.counts) - started(a.counts)),
    days: [...days].map(([day, counts]) => ({ day, counts })).sort((a, b) => (a.day < b.day ? 1 : -1)),
  };
}

/** First day of a period ending today: `days` = 7 covers today and the 6 days before. */
export function periodStart(days: number | null, now: Date): string | null {
  if (!days) return null;
  return new Date(now.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
}
