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
ID. The daily limit keeps short-lived counters in two more tables (below). The page path is stripped of query strings and fragments.

Feedback is **private to the owner**. It is never committed to this repository
(which is public), never shown on a public page, never written to GitHub Actions
logs, and the service worker never caches `/api/` responses.

## Abuse limits

- Per visitor: **5 messages a day** (owner's choice, 2026-10-13;
  `VISITOR_DAILY_LIMIT` in `app/src/lib/feedback.ts`). To count without keeping
  IP addresses, a visitor is identified only by a hash of their IP mixed with a
  random value made fresh each UTC day. The IP itself is never stored, and each
  day's random value and counters are deleted the next day, after which nobody
  can link those hashes to anyone.
- Bursts: at most 5 requests a minute per visitor through Cloudflare's rate
  limiting binding (`FEEDBACK_LIMITER`, IP used only as an in-memory counter key
  inside Cloudflare). This also slows down guessing at the inbox key.
- Whole site: at most 200 messages per UTC day (`DAILY_CAP`), so even abuse
  costs a few hundred D1 writes a day.
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

## AI agents' access (read-only, for reviews)

Asked by the owner on 2026-10-13: Claude, Codex, or any other AI worker the
owner sets up should be able to read feedback. Each agent gets **its own
read-only key**: it can list and export, but can't change a status or delete,
and the owner revokes one agent without touching the others or their own key.

The keys live only in Cloudflare (as Worker secrets named
`FEEDBACK_AGENT_TOKEN_<NAME>`) and in that agent's own environment (as
`FEEDBACK_AGENT_TOKEN`). Never in this repo, a GitHub secret, or chat.

Any agent reads feedback with:

```
pnpm --filter @cpe/app run feedback            # new messages, as Markdown
pnpm --filter @cpe/app run feedback -- --all   # everything
```

or, without the repo, `GET /api/feedback/inbox` (add `?format=csv` for CSV) with
the header `Authorization: Bearer <key>`.

Agents keep what they read private: never commit feedback, quote it in a PR,
issue or other public place, or fetch it from GitHub Actions (the repo and its
logs are public; the script refuses to run there).

### Granting an agent access (owner)

1. Make a long random value (24+ characters; a password manager's generator).
2. Cloudflare dashboard: Workers & Pages, `cert-practice-engine`, Settings,
   Variables and Secrets, Add, type **Secret**, name
   `FEEDBACK_AGENT_TOKEN_<NAME>` (for example `FEEDBACK_AGENT_TOKEN_CLAUDE`,
   `FEEDBACK_AGENT_TOKEN_CODEX`), value from step 1.
3. Give the same value to the agent as the environment variable
   `FEEDBACK_AGENT_TOKEN`, and let it reach
   `cert-practice-engine.vitoria-nuno.workers.dev`:
   - **Claude (project cloud sessions):** project settings, cloud environment,
     add an environment; set the variable (or a network secret) and add the
     domain under allowed network domains. New sessions pick it up.
   - **Codex:** the environment's secrets or environment variables in Codex
     settings, plus internet access for that domain.
   - **Any other worker:** its own secret store, as an environment variable.
4. To revoke: delete that `FEEDBACK_AGENT_TOKEN_<NAME>` secret in Cloudflare.

## One-time setup (owner)

1. **Access key.** In the Cloudflare dashboard: Workers & Pages,
   `cert-practice-engine`, Settings, Variables and Secrets, Add, type
   **Secret**, name `FEEDBACK_READ_TOKEN`, value a long random string (at
   least 24 characters; a password manager's generator is ideal). Keep it in
   your password manager. Secrets survive later deploys. Never put it in the
   repo, a GitHub secret log, or chat.
2. **AI agents (optional).** One read-only key per agent, as above.
3. **Database.** The first deploy creates `knowmark-feedback` automatically if
   the `CLOUDFLARE_API_TOKEN` can manage D1. If the deploy log says Wrangler
   lacks permission, edit that API token in Cloudflare (My Profile, API Tokens)
   and add **Account, D1, Edit**, then re-run the deploy. The table is created
   by the Worker on first use, so there is no migration step.

## Reviewing it

Nothing is scheduled (AGENTS.md: no automation without the owner's approval).
Suggested rhythm, by hand or by asking an agent: once a week,
read the "new" messages,
mark each message considering, done or dismissed, and turn the considering
ones into roadmap items or `fix/<question-id>` PRs. Agents can summarise and
suggest; the owner sets statuses (agent keys are read-only). If the owner approves
scheduling later (roadmap phase 6), a weekly Claude routine could summarise
new feedback for the owner privately in the project; it must never post feedback to the public
repo.
