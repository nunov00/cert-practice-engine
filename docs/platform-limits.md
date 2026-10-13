# Platform limits and budget

Owner rule (2026-10-12): stay **well within** the free plans of Cloudflare and
GitHub, so several pilots can run on the same accounts. This file is the source
of truth for the limits, our budget, and the guardrails that enforce them.
Providers change limits without notice: re-check the sources before relying on a
number, and update the "verified" date when you do.

## Cloudflare Workers (Free plan)

Verified 2026-10-13 against
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[static assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
and [redirects](https://developers.cloudflare.com/workers/static-assets/redirects/).

The app is Next.js on Workers via `@opennextjs/cloudflare`, so it is **not** a
pure static site: build output under `/_next/static`, icons and `sw.js` are
static assets (free, unlimited), but every **page** request runs the Worker,
which serves prerendered HTML from its cache. Page views therefore count against
the request quota below.

### Per Worker (each pilot gets its own)

Checked on every CI run and before every deploy by `app/scripts/capacity.ts`.

| Limit | Free plan | Our budget per pilot | Now (2026-10-13) |
|---|---|---|---|
| Static asset files per version | 20,000 | 4,000 | 21 |
| Size of one asset file | 25 MiB | 5 MiB | 0.22 MiB |
| Worker size, uncompressed | 64 MiB | 16 MiB | 4.9 MiB |
| Worker size, gzip | no limit (was 3 MiB) | 3 MiB | 1.0 MiB |
| `_redirects` rules (static / dynamic) | 2,000 / 100 | 400 / 20 | 0 / 0 |
| Worker startup time | 1 s | 200 ms | 20 ms (deploy log) |
| CPU time per request | 10 ms | keep pages prerendered | prerendered |
| Memory per isolate | 128 MB | | |
| Subrequests per request | 50 | | none |

Cloudflare no longer has a compressed size limit ("only the uncompressed bundle
size counts"). We keep the old 3 MiB gzip figure as a budget so the app still
fits if it comes back. Startup time is only reported by a real deploy: read
`Worker Startup Time` in the deploy log.

### Per account (shared by every pilot)

These are the limits several pilots actually compete for. Not checked
automatically; look at the Cloudflare dashboard (Workers, Metrics) before adding
a pilot.

| Limit | Free plan | Our budget |
|---|---|---|
| Worker requests per day (resets 00:00 UTC) | 100,000 | 20,000 per pilot, 80,000 total |
| Workers per account | 100 | one per pilot |
| Cron triggers per account | 5 | 0 until the owner approves scheduling |
| Static asset requests | free, unlimited | |

Over 100,000 requests a day, Worker requests fail (HTTP 429 on routes that must
run the Worker) until midnight UTC. Ways to stay low: keep pages static or
cached, let the service worker serve repeat visits, and don't add routes that
force the Worker to run first.

### D1 and rate limiting (feedback, `docs/feedback.md`)

Verified 2026-10-13 against [D1 limits](https://developers.cloudflare.com/d1/platform/limits/),
[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) and the
[rate limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
Per account, shared by every pilot:

| Limit | Free plan | Our use |
|---|---|---|
| D1 databases | 10 | 1 (`knowmark-feedback`: feedback outbox and daily counters) |
| D1 size per database / per account | 500 MB / 5 GB | well under 1 MB (feedback is text, capped at 200 messages a day) |
| D1 rows written per day | 100,000 | at most about 1,000 (200 messages plus their daily-limit counters) |
| D1 rows read per day | 5,000,000 | a few hundred (inbox reads, daily-cap counts) |
| Rate limiting `namespace_id` | unique per account | `1001` = this pilot's feedback; give other pilots their own |

Over a D1 daily limit, queries fail until 00:00 UTC. The rate limiting binding
isn't listed on the Free plan's limits page, but it deployed and is active on
this Free account (2026-10-13). Deploying D1 bindings needs **D1 Edit** on the
deploy API token (added by the owner on 2026-10-13).

Feedback files go to a private GitHub repo through the contents API: one
request per message (at most 200 a day), far below GitHub's 5,000 requests an
hour per token, and one Worker subrequest each (limit 50 per request; we file
at most 10 per request).

Workers Builds (Cloudflare building from GitHub) is not used: we build and deploy
from GitHub Actions. Check its allowances if that changes.

### Rules

- CI warns when a per-Worker check goes over budget, and fails over a Free limit.
  `pnpm --filter @cpe/app run deploy` runs the same check and stops before
  uploading if a Free limit would be crossed.
- Crossing a Free limit, or raising a budget, is an owner cost decision, never
  an automatic upgrade.
- Wrangler is pinned to an exact version in `app/package.json` (now 4.142.0;
  100,000-file paid limit needs ≥ 4.34, per-branch previews need ≥ 4.135).

## GitHub

Verified 2026-10-13 against
[Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions),
[Actions limits](https://docs.github.com/en/actions/reference/limits) and
[hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).

The repository is **public**, so Actions on standard hosted runners is free and
unmetered. If it is made private, the GitHub Free allowance applies: 2,000
minutes a month and 500 MB artifact storage, shared by every private repo on the
account.

| Limit | Value | Now |
|---|---|---|
| Actions minutes | free while public; 2,000/month if private | about 1 minute per CI or deploy run |
| Cache storage per repo | 10 GB | about 0.2 GB (pnpm store) |
| Job time | 6 hours | about 1 minute |
| Concurrent jobs | 20 | 1 |
| Runner (`ubuntu-latest`) | public repo 4 CPU / 16 GB RAM; private 2 CPU / 8 GB | |

Exam search runs in the browser over an index built when the home page is
prerendered (`app/src/lib/catalogue.ts`): domain names plus deduplicated
subdomain keywords, under 40 KB for 50 exams (`app/test/catalogue.test.ts`).
Searching costs no Worker request, and the search box keeps its state in the
tab rather than the URL, so it never creates new page requests.

Build memory is the practical ceiling once there are thousands of pages
(measured on the earlier project with a static site generator: about 0.9 GiB at
2,000 pages, 2.9 GiB at 10,000, failed at 20,000 on a private-repo runner;
sharding into 5,000-page builds kept each near 1.8 GiB). Today the app builds 12
pages, because drills are one page per domain, not per question.

### Workflow rules

- Every action is pinned to a full commit SHA with the tag in a comment. Update
  the SHA and comment together.
- No scheduled workflows without the owner's approval (AGENTS.md).

### Proposed `main` ruleset (not applied)

The legacy branch-protection API returned 403 to an AI integration on the earlier
project; repository rulesets are readable through the REST API. Proposed, for the
owner to apply in Settings, Rules, Rulesets:

- target: default branch; enforcement: active; no bypass actors;
- require a pull request, 0 approvals (all agents share the owner's GitHub
  identity, so an approval proves nothing and would block the agreed
  merge-when-green flow);
- require status check `check` from GitHub Actions (integration id 15368),
  strict (branch must be up to date);
- block force pushes and deletion.

Untested: `require_extra_approval_for_unattributed_changes` with AI-connector
commits; verify on the first real merge if it is turned on.

## AI subscriptions

The project runs on subscriptions, with no API accounts, so none of these
limits are metered in money. They matter once phase 6 schedules automation.

- ChatGPT scheduled tasks: at most **5 active tasks on Plus** (3 Free/Go, 10
  Business, 15 Pro), verified 2026-10-13 against
  [OpenAI help](https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt).
  Budget a slot for every recurring job.

Observed on the earlier project, not documented by the providers (re-test
rather than trust):

- Neither subscription shows a usage meter. Track run duration and throttling as
  proxies; don't exhaust the allowance to test it.
- Scheduled runs can start late or not at all: every scheduled job must be
  idempotent and safe if late or missed.
- All agents act through the owner's single GitHub identity, so review
  provenance is self-reported, not authenticated.
- A Claude Code routine created through the API had no repository access.
  Create routines from the claude.ai Routines UI with the repository attached.

## Carried over but left out

From the owner's list from the earlier project, these don't apply here today:

- **Static-site hosting limits as the main constraint.** This app runs a Worker,
  so Worker size, startup time and the daily request quota matter more than
  asset counts (covered above).
- **Build memory at 2,000 to 20,000 pages.** Drills are one page per domain, so
  the build has 12 pages and none per question. Revisit if pages per question
  are ever added.
- **Wrangler ≥ 4.34 for the 100,000-file limit.** That limit is paid-plan only.
- **`pull_request_target` workflows.** None exist.
- **Branch cleanup by workflow.** GitHub's "Automatically delete head branches"
  setting does it without a workflow; proposed for the owner to switch on.
