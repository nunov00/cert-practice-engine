// Server-only helpers for the feedback API routes: Cloudflare bindings and responses.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Db } from "./feedback";

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Bindings from app/wrangler.jsonc (docs/feedback.md). No secrets. */
export interface FeedbackEnv {
  FEEDBACK_DB?: Db;
  FEEDBACK_LIMITER?: RateLimiter;
  /** Per-visitor burst limit for anonymous usage counts (docs/analytics.md). */
  STATS_LIMITER?: RateLimiter;
}

export async function feedbackContext(): Promise<{ env: FeedbackEnv; waitUntil: (p: Promise<unknown>) => void }> {
  const { env, ctx } = await getCloudflareContext({ async: true });
  return { env: env as unknown as FeedbackEnv, waitUntil: (p) => ctx.waitUntil(p) };
}

/**
 * Per-visitor limit using Cloudflare's rate limiting binding. The IP is only the
 * counter key inside Cloudflare for the current minute; we never store it.
 */
export async function overRateLimit(
  env: FeedbackEnv,
  request: Request,
  scope: string,
  limiter = env.FEEDBACK_LIMITER,
): Promise<boolean> {
  if (!limiter) return false;
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const { success } = await limiter.limit({ key: `${scope}:${ip}` });
  return !success;
}

/** Rejects posts from other sites (browsers always send Origin on a cross-site POST). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = request.headers.get("host") ?? new URL(request.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const NO_STORE = { "cache-control": "no-store", "x-robots-tag": "noindex" };

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}
