# 0002: Host on Cloudflare Workers instead of Vercel

Date: 2026-10-12. Decided by: owner. Supersedes the hosting part of D2 in 0001.

- The Next.js app runs on **Cloudflare Workers** through the OpenNext adapter
  (`@opennextjs/cloudflare`, config in `app/wrangler.jsonc` and `app/open-next.config.ts`).
- Next.js, Supabase (EU) and Paddle stay as decided in 0001.
- Why: near-zero hosting cost, and the owner already uses Cloudflare.
- Trade-off: a little more setup than Vercel, and Worker runtime limits apply to
  server code (use Web APIs; Node APIs only via `nodejs_compat`).
