# Roadmap

Single place to track what's done and what's next. Each phase starts only on the
owner's go-ahead. Update this file in the same PR that finishes a phase.

Order revised 2026-10-12 by the owner: **accounts and payments come last**; AAIR
moves up, then the user experience. Everything must fit the free plans (below).

| # | Phase | Status |
|---|-------|--------|
| 1 | Repo skeleton: recipes, bank, validator, CI, runbooks | Done (#2) |
| 2 | First manual CISSP content run (Domain 1, 20 questions, free sample) | Done (#3) |
| 3 | Free-drills web app on Cloudflare Workers, manual deploy | Done (#4) |
| 3a | Installable app (iPhone home screen, Chrome install), offline free drills | Done (#5) |
| 3b | Brand name and custom domain (decision D5) | Name done: Knowmark (decision 0003). Domain moved to phase 8 |
| 3c | All published questions open until monetisation (decision 0004) | Done (#6) |
| 3d | AAIR recipe from ISACA's official outline, first original questions (nothing reused from earlier projects) | In progress |
| 3e | User experience: look and feel, usability, finding and searching certifications | Next |
| 4 | CISSP content for domains 2–8 (manual runs, same pipeline) | Planned |
| 5 | Mock exams, weak-spot review, readiness score, report-question button | Planned |
| 6 | Scheduled automation: generation/check runs, outline watch, weekly digest | Planned, needs approval |
| 7 | AAIR full bank | Planned (after 3d) |
| 8 | **Accounts, payments and domain** (last) | Planned |

## Phase 8: accounts and payments (deferred on purpose)

Kept here so it isn't lost while the free product grows. Design is in proposal
0001 §6.3–6.4 and decision 0001:

- Supabase Auth (EU region): email magic link + Google; free sample stays usable
  without an account; browser progress merges into the account on first sign-in.
- Paddle as merchant of record: one-off unlock per exam (recipe `product.unlock`,
  CHF 29 / 120 days), checkout via a provider interface so it can be swapped.
- `entitlements` table driven by verified, idempotent payment webhooks; refunds
  end access.
- Paid questions served only by server routes that check entitlement. Until then
  every published question is open to everyone (decision 0004). Switching on the
  10-free-questions limit is part of this phase: set `PUBLIC_ACCESS` to
  `free-sample` in `tools/src/build.ts` and pick the sample questions. Questions
  already shipped while open should be treated as public for good, so the paid
  bank should mostly be questions published after the switch.
- Runs on Cloudflare Workers (decision 0002), so server code uses Web APIs.

Owner prerequisites when this phase starts: a Supabase project, a Paddle account,
terms, privacy and refund pages, and the domain **knowmark.app** (the owner deferred
buying it to this phase on 2026-10-12; also run the EU and Swiss trademark searches
noted in decision 0003 first). Until then the site stays on its workers.dev address.

Until phase 8, phases 4–7 must not assume a signed-in user: anything per-learner
(progress, weak spots, readiness) lives in the browser and is designed to move
into the account later.

## Stay within the free plans

Owner rule (2026-10-12): the project must stay well within the free plans of
Cloudflare and GitHub. Check the current limits on their pricing pages before a
change that could approach them. Limits as understood on 2026-10-12, with where
we are:

| Limit | Free plan | Now |
|-------|-----------|-----|
| Cloudflare Workers requests | 100,000 per day | Low traffic |
| Worker CPU time | 10 ms per request | Static pages, prerendered at build |
| Worker bundle size | 3 MiB compressed | About 0.9 MiB |
| GitHub Actions (private repo) | 2,000 minutes per month | About 1 minute per CI or deploy run |

Design consequences: keep pages static or cached so most requests cost no Worker
CPU; keep question data small (search runs in the browser over a prebuilt index,
not a server); no Actions on a schedule without the owner's approval; watch the
bundle size as the bank grows (paid questions in phase 8 move to a database
anyway).
