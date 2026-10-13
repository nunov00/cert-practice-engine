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

## Claude's access (read-only, for reviews)

Asked by the owner on 2026-10-13: Claude should be able to read feedback too.
Claude gets its **own read-only key**, `FEEDBACK_AGENT_TOKEN`: it can list and
export, but can't change a status or delete, and the owner can revoke it
without changing their own key.

A Claude session reads it with:

```
pnpm --filter @cpe/app run feedback            # new messages, as Markdown
pnpm --filter @cpe/app run feedback -- --all   # everything
```

The output stays in the session. Claude never commits feedback, quotes it in a
PR, issue or other public place, or fetches it from GitHub Actions (the repo
and its logs are public; the script refuses to run there).

## One-time setup (owner)

1. **Access key.** In the Cloudflare dashboard: Workers & Pages,
   `cert-practice-engine`, Settings, Variables and Secrets, Add, type
   **Secret**, name `FEEDBACK_READ_TOKEN`, value a long random string (at
   least 24 characters; a password manager's generator is ideal). Keep it in
   your password manager. Secrets survive later deploys. Never put it in the
   repo, a GitHub secret log, or chat.
2. **Claude's key (optional).** Add a second Worker secret the same way,
   `FEEDBACK_AGENT_TOKEN`, with a different long random value. Then give the
   same value to Claude's cloud environment: in the project's settings, add a
   cloud environment, set the environment variable `FEEDBACK_AGENT_TOKEN`, and
   under network access allow the domain
   `cert-practice-engine.vitoria-nuno.workers.dev` (the default network
   policy blocks it). New sessions then pick it up. To revoke, delete the
   Worker secret.
3. **Database.** The first deploy creates `knowmark-feedback` automatically if
   the `CLOUDFLARE_API_TOKEN` can manage D1. If the deploy log says Wrangler
   lacks permission, edit that API token in Cloudflare (My Profile, API Tokens)
   and add **Account, D1, Edit**, then re-run the deploy. The table is created
   by the Worker on first use, so there is no migration step.

## Reviewing it

Nothing is scheduled (AGENTS.md: no automation without the owner's approval).
Suggested rhythm, by hand or by asking Claude in the project: once a week,
read the "new" messages,
mark each message considering, done or dismissed, and turn the considering
ones into roadmap items or `fix/<question-id>` PRs. Claude can summarise and
suggest; the owner sets statuses (Claude's key is read-only). If the owner approves
scheduling later (roadmap phase 6), a weekly Claude routine could summarise
new feedback for the owner privately in the project; it must never post feedback to the public
repo.
