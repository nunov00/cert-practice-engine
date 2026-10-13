import { listExams } from "@/lib/content";
import { feedbackContext, json, overRateLimit, sameOrigin } from "@/lib/feedback-server";
import { buildReport, countStat, parseStat, periodStart, readStats, type KnownExams } from "@/lib/stats";

export const dynamic = "force-dynamic";

const known: KnownExams = new Map(listExams().map((e) => [e.id, new Set(e.domains.map((d) => d.id))]));
const PERIODS = new Set([7, 30, 90]);
const CACHE_SECONDS = 300;

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

/** Totals for the stats page. Open to anyone (owner's choice); cached for a few minutes to keep D1 reads low. */
export async function GET(request: Request) {
  const { env, waitUntil } = await feedbackContext();
  if (!env.FEEDBACK_DB) return json({ error: "Stats aren't available right now." }, 503);
  const days = Number(new URL(request.url).searchParams.get("days"));
  const period = PERIODS.has(days) ? days : 0;
  const cacheKey = new Request(new URL(`/api/stats?days=${period}`, request.url));
  const cache = (globalThis.caches as (CacheStorage & { default?: Cache }) | undefined)?.default;
  const hit = await cache?.match(cacheKey);
  if (hit) return hit;
  if (await overRateLimit(env, request, "stats-read", env.STATS_LIMITER)) {
    return json({ error: "Too many requests. Wait a minute." }, 429);
  }

  const now = new Date();
  const from = periodStart(period || null, now);
  const report = buildReport(await readStats(env.FEEDBACK_DB, from), from);
  const names = Object.fromEntries(
    listExams().map((e) => [e.id, { name: e.name, domains: Object.fromEntries(e.domains.map((d) => [d.id, d.name])) }]),
  );
  const res = json({ ...report, today: now.toISOString().slice(0, 10), names });
  if (cache) {
    const cached = new Response(res.clone().body, res);
    cached.headers.set("cache-control", `public, max-age=${CACHE_SECONDS}`);
    waitUntil(cache.put(cacheKey, cached));
  }
  return res;
}
