// Server-only helpers for the feedback API routes: Cloudflare bindings and responses.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Db, FileWriter } from "./feedback";

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Bindings and vars from app/wrangler.jsonc, plus the owner's secret (docs/feedback.md). */
export interface FeedbackEnv {
  FEEDBACK_DB?: Db;
  FEEDBACK_LIMITER?: RateLimiter;
  /** Private repo that receives the messages, e.g. "nunov00/knowmark-feedback". */
  FEEDBACK_REPO?: string;
  /** Fine-grained GitHub token: that repo only, Contents read and write. */
  FEEDBACK_GITHUB_TOKEN?: string;
  /** Per-visitor burst limit for anonymous usage counts (docs/analytics.md). */
  STATS_LIMITER?: RateLimiter;
}

/** Writes files into the private feedback repo, or null until the owner has set it up. */
export function githubWriter(env: FeedbackEnv): FileWriter | null {
  const repo = env.FEEDBACK_REPO;
  const token = env.FEEDBACK_GITHUB_TOKEN;
  if (!repo || !token || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  return async (path, content, message) => {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "knowmark-feedback",
        "content-type": "application/json",
      },
      body: JSON.stringify({ message, content: base64Utf8(content) }),
    });
    // 422: the file already exists (another request filed it first), so it is stored.
    return res.ok || res.status === 422;
  };
}

function base64Utf8(text: string): string {
  let bin = "";
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte);
  return btoa(bin);
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
