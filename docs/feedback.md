# Anonymous feedback

Asked by the owner on 2026-10-13: let learners send anonymous feedback, kept
private to the owner, to review every so often and pick ideas from.

## What learners see

- **Feedback** in the header (desktop) and footer (every page) opens `/feedback`.
- They pick a category (idea, something isn't working, a question looks wrong,
  something else) and write up to 2,000 characters. The form asks them not to
  include personal details.
- The page they came from on the site is attached as a path (for example
  `/exams/cissp`), with a "Leave it out" button.

## What we store, and what we don't

One row per message in the Cloudflare D1 database `knowmark-feedback`
(table `feedback`): id, time, UTC day, category, message, page path, review
status. Nothing else: no name, email, IP address, user agent, cookie or device
ID. The page path is stripped of query strings and fragments.

Feedback is **private to the owner**. It is never committed to this repository
(which is public), never shown on a public page, never written to GitHub Actions
logs, and the service worker never caches `/api/` responses.

## Abuse limits

- Per visitor: 5 posts a minute, through Cloudflare's rate limiting binding
  (`FEEDBACK_LIMITER`). The IP address is only the counter key inside
  Cloudflare for that minute; we never see or store it.
- Whole site: at most 200 messages per UTC day (`DAILY_CAP` in
  `app/src/lib/feedback.ts`), so even abuse costs a few hundred D1 writes a day.
- Posts from other websites are refused (Origin check), and a hidden honeypot
  field drops simple bots.

## Reading feedback (owner)

Open `/feedback/inbox` on the site and enter the access key. You can filter by
status (new, considering, done, dismissed), change a message's status, delete
one, and download everything as CSV. The key is kept only in that browser tab
and is sent as a header, never in the URL. The inbox API refuses everything
until the key is set, and failed attempts share the 5-a-minute limit.

From a computer with Wrangler logged in to the account, the same data is
available directly:

```
cd app
pnpm exec wrangler d1 execute knowmark-feedback --remote \
  --command "SELECT id, created_at, category, status, page, message FROM feedback ORDER BY id DESC"
```

## One-time setup (owner)

1. **Access key.** In the Cloudflare dashboard: Workers & Pages,
   `cert-practice-engine`, Settings, Variables and Secrets, Add, type
   **Secret**, name `FEEDBACK_READ_TOKEN`, value a long random string (at
   least 24 characters; a password manager's generator is ideal). Keep it in
   your password manager. Secrets survive later deploys. Never put it in the
   repo, a GitHub secret log, or chat.
2. **Database.** The first deploy creates `knowmark-feedback` automatically if
   the `CLOUDFLARE_API_TOKEN` can manage D1. If the deploy log says Wrangler
   lacks permission, edit that API token in Cloudflare (My Profile, API Tokens)
   and add **Account, D1, Edit**, then re-run the deploy. The table is created
   by the Worker on first use, so there is no migration step.

## Reviewing it

Nothing is scheduled (AGENTS.md: no automation without the owner's approval).
Suggested rhythm, by hand: once a week, open the inbox on the "new" filter,
mark each message considering, done or dismissed, and turn the considering
ones into roadmap items or `fix/<question-id>` PRs. If the owner approves
scheduling later (roadmap phase 6), a weekly digest could summarise new
feedback for the owner privately; it must never post feedback to the public
repo.
