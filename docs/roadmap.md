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
| 3d | AAIR recipe from ISACA's official outline, first original questions (nothing reused from earlier projects) | Done (#7, 24 questions) |
| 3e | User experience: brand header, exam catalogue with search and issuer filter (designed for ~50 exams), exam pages with per-domain readiness, practice sessions with running score and review of missed questions, progress kept on the device | Done (#10) |
| 3f | Anonymous feedback form; messages filed in a private repo that AI agents review on request (`docs/feedback.md`) | Done (#12, #13, #15) |
| 4 | CISSP content for domains 2–8 (manual runs, same pipeline) | Next |
| 5 | Mock exams, spaced weak-spot review, exam-wide "looks ready" check, report-question button | Planned |
| 6 | Scheduled automation: generation/check runs, outline watch, periodic bank review, weekly digest | Planned, needs approval |
| 7 | AAIR full bank | Planned (after 3d) |
| 8 | **Accounts, payments and domain** (last) | Planned |

## Keeping the bank current

Asked by the owner on 2026-10-13. Design: `docs/automation/bank-review.md`.
Every exam's bank gets a monthly outline check, a quarterly review that
re-checks the oldest quarter of published questions against current practice
and the current outline (so each question is re-checked at least once a year),
and a quarterly audit of domain weights, difficulty mix and question types.
Outdated questions are fixed or retired through reviewed PRs, and gaps become
generation runs. It runs by hand until the owner approves scheduling in phase 6.
Building it needs a `reviewed_on` date on each question and a `pnpm review`
command.

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
Cloudflare and GitHub, with room for several pilots on the same accounts.
Limits, our per-pilot budget, current usage and the guardrails are in
`docs/platform-limits.md` (verified 2026-10-13). In short: each Worker is far
below its limits (4.9 MiB of 64 MiB, 21 of 20,000 asset files); the shared
limit to watch is 100,000 Worker requests a day per Cloudflare account, since
every page view runs the Worker.

Design consequences: keep pages static or cached so most requests cost no Worker
CPU; keep question data small (search runs in the browser over a prebuilt index,
not a server); no Actions on a schedule without the owner's approval; CI and the
deploy script check bundle capacity on every run (paid questions in phase 8 move
to a database anyway).
