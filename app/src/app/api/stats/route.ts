import { listExams } from "@/lib/content";
import { feedbackContext, json, overRateLimit, sameOrigin } from "@/lib/feedback-server";
import { buildReport, countStat, parseStat, periodStart, readStats, sameKey, type KnownExams } from "@/lib/stats";

export const dynamic = "force-dynamic";

const known: KnownExams = new Map(listExams().map((e) => [e.id, new Set(e.domains.map((d) => d.id))]));
const PERIODS = new Set([7, 30, 90]);

/**
 * Anonymous usage counts (docs/analytics.md). The browser sends each item at
 * most once a day; we add one to that day's total and keep nothing else.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Not allowed." }, 403);
  const { env } = await feedbackContext();
  if (!env.FEEDBACK_DB) return json({ ok: false }, 503);
  if (await overRateLimit(env, request, "stats", env.STATS_LIMITER)) return json({ ok: false }, 429);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }
  const input = parseStat(body, known);
  if (!input) return json({ ok: false }, 400);
  const result = await countStat(env.FEEDBACK_DB, input, new Date());
  return json({ ok: result === "counted" });
}

/** The owner's stats page reads totals here with their key (Worker secret STATS_READ_TOKEN). */
export async function GET(request: Request) {
  const { env } = await feedbackContext();
  if (!env.FEEDBACK_DB || !env.STATS_READ_TOKEN) return json({ error: "not-set-up" }, 503);
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!given || !sameKey(given, env.STATS_READ_TOKEN)) {
    if (await overRateLimit(env, request, "stats-read")) return json({ error: "Too many tries. Wait a minute." }, 429);
    return json({ error: "That key isn't right." }, 401);
  }
  const days = Number(new URL(request.url).searchParams.get("days"));
  const now = new Date();
  const from = periodStart(PERIODS.has(days) ? days : null, now);
  const report = buildReport(await readStats(env.FEEDBACK_DB, from), from);
  const names = Object.fromEntries(
    listExams().map((e) => [e.id, { name: e.name, domains: Object.fromEntries(e.domains.map((d) => [d.id, d.name])) }]),
  );
  return json({ ...report, today: now.toISOString().slice(0, 10), names });
}
