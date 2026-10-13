// Server-only helpers for the feedback API routes: Cloudflare bindings and responses.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Db } from "./feedback";

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Bindings from app/wrangler.jsonc, plus the owner's secret (docs/feedback.md). */
export interface FeedbackEnv {
  FEEDBACK_DB?: Db;
  FEEDBACK_LIMITER?: RateLimiter;
  FEEDBACK_READ_TOKEN?: string;
  /**
   * Read-only keys for AI agents (Claude, Codex, ...): one Worker secret per
   * agent, named FEEDBACK_AGENT_TOKEN_<NAME>, so each can be revoked alone.
   */
  [agentKey: `FEEDBACK_AGENT_TOKEN_${string}`]: string | undefined;
}

/** All configured per-agent read-only keys. */
export function agentTokens(env: FeedbackEnv): string[] {
  return Object.entries(env)
    .filter(([k, v]) => k.startsWith("FEEDBACK_AGENT_TOKEN_") && typeof v === "string")
    .map(([, v]) => v as string);
}

export async function feedbackEnv(): Promise<FeedbackEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as FeedbackEnv;
}

/**
 * Per-visitor limit using Cloudflare's rate limiting binding. The IP is only the
 * counter key inside Cloudflare for the current minute; we never store it.
 */
export async function overRateLimit(env: FeedbackEnv, request: Request, scope: string): Promise<boolean> {
  if (!env.FEEDBACK_LIMITER) return false;
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const { success } = await env.FEEDBACK_LIMITER.limit({ key: `${scope}:${ip}` });
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

export function text(body: string, contentType: string, extra: Record<string, string> = {}): Response {
  return new Response(body, { headers: { ...NO_STORE, "content-type": contentType, ...extra } });
}
