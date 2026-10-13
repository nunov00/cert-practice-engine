# Usage stats

Asked by the owner on 2026-10-13: a stats page like the one on the
earlier Five Minutes site (headline totals, a ranked table, recent days as
bars), adapted to this site.

## What the owner sees

`/stats` (not linked anywhere, `noindex`). Open to anyone with the link: the
owner chose no key (2026-10-13), since it shows only anonymous totals and the
repo is public anyway. Periods: 7, 30, 90 days or all time.

- Tiles: exam page opens, practice sessions started and finished, mock exams
  started.
- **Exams**, ranked by opens plus sessions started: opens, drills, Quick 10,
  mocks, wrong-answer tests, sessions finished.
- **Domains by practice**: domain drills and one-domain wrong-answer tests,
  started and finished (top 15).
- **Daily activity**: exam page opens plus sessions started, per UTC day, newest
  first (last 30 days with activity).

## What is counted

| Event | When |
|---|---|
| `exam_open` | an exam page opens |
| `drill_start` / `drill_finish` | a drill page opens / reaches its results (domain, or all domains from "review") |
| `quick_start` / `quick_finish` | a timed Quick 10 starts / ends |
| `mock_start` / `mock_finish` | a timed mock exam starts / ends |
| `missed_start` / `missed_finish` | a timed wrong-answers test starts / ends (all domains or one) |

Each browser sends an item **at most once per UTC day** (event + exam +
domain), remembered in `localStorage` (`knowmark-counted`, today's list only),
so these are not counts of unique people. Browsers with Global Privacy Control
or Do Not Track on send nothing. Code: `app/src/lib/track.ts` (browser),
`app/src/app/api/stats/route.ts`, `app/src/lib/stats.ts`.

## What we store, and what we don't

D1 database `knowmark-feedback` (the same one as feedback, so no new database),
table `stats_daily`: day, event, exam, domain, count. That is all. No visitor
ID, IP address, user agent, cookie, referrer or time finer than the day. Exam
and domain must exist in the published content, so junk can't add rows.
Nothing goes to GitHub, Actions logs or this public repo.

## Limits

- Burst: 30 counts a minute per visitor (rate limiting binding `STATS_LIMITER`,
  namespace `1002`; IP only as an in-memory key inside Cloudflare).
- Whole site: 5,000 counts per UTC day (`STATS_DAILY_CAP`, table `stats_cap`).
- Reading: `GET /api/stats` responses are cached for 5 minutes per period
  (Cloudflare cache API), and uncached reads share the 30 a minute per visitor
  limit, so bots can't run up D1 reads.

Budget: see `docs/platform-limits.md`. At the cap, at most about 10,000 D1 rows
written a day (count plus cap row) and 5,000 Worker requests; real use is far
lower because each browser sends each item once a day.

No setup needed: no secrets, no new database.
