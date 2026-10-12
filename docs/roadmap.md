# Roadmap

Single place to track what's done and what's next. Each phase starts only on the
owner's go-ahead. Update this file in the same PR that finishes a phase.

Order revised 2026-10-12 by the owner: **accounts and payments come last**.

| # | Phase | Status |
|---|-------|--------|
| 1 | Repo skeleton: recipes, bank, validator, CI, runbooks | Done (#2) |
| 2 | First manual CISSP content run (Domain 1, 20 questions, free sample) | Done (#3) |
| 3 | Free-drills web app on Cloudflare Workers, manual deploy | Done (#4) |
| 3a | Installable app (iPhone home screen, Chrome install), offline free drills | In progress |
| 3b | Brand name and custom domain (decision D5) | Owner choosing |
| 4 | CISSP content for domains 2–8 (manual runs, same pipeline) | Next |
| 5 | Mock exams, weak-spot review, readiness score, report-question button | Planned |
| 6 | Scheduled automation: generation/check runs, outline watch, weekly digest | Planned, needs approval |
| 7 | AAIR recipe and content | Waiting on confirmed domain weights |
| 8 | **Accounts and payments** (last) | Planned |

## Phase 8: accounts and payments (deferred on purpose)

Kept here so it isn't lost while the free product grows. Design is in proposal
0001 §6.3–6.4 and decision 0001:

- Supabase Auth (EU region): email magic link + Google; free sample stays usable
  without an account; browser progress merges into the account on first sign-in.
- Paddle as merchant of record: one-off unlock per exam (recipe `product.unlock`,
  CHF 29 / 120 days), checkout via a provider interface so it can be swapped.
- `entitlements` table driven by verified, idempotent payment webhooks; refunds
  end access.
- Paid questions served only by server routes that check entitlement; until then
  the app ships only the free sample (`tools/src/build.ts`, guarded by
  `app/test/content.test.ts`).
- Runs on Cloudflare Workers (decision 0002), so server code uses Web APIs.

Owner prerequisites when this phase starts: a Supabase project, a Paddle account,
and terms, privacy and refund pages.

Until phase 8, phases 4–7 must not assume a signed-in user: anything per-learner
(progress, weak spots, readiness) lives in the browser and is designed to move
into the account later.
