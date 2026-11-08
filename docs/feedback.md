# Anonymous feedback

Asked by the owner on 2026-10-13: let learners send anonymous feedback, kept
private, that the owner reviews every so often by asking an AI agent (Claude,
Codex, or another worker they set up) for a summary. Design suggested by Codex
and approved by the owner the same day.

## What learners see

- **Feedback** in the header (desktop) and footer (every page) opens `/feedback`.
- A category (idea, something isn't working, a question looks wrong, something
  else) and a message of up to 2,000 characters. No name, email or account. The
  form asks them not to include personal details.
- The page they came from on the site is attached as a path (for example
  `/exams/cissp`), with a "Leave it out" button.
- Up to 5 messages per visitor per day.

## Where it goes

Each message is **one row in the `feedback` table of the Cloudflare D1 database
`knowmark-feedback`** (binding `FEEDBACK_DB` in `app/wrangler.jsonc`):
`id`, `created_at`, `day`, `category`, `message`, `page`, `status` (`new` until
an agent marks it `reviewed`).

The site needs **no token or secret** for this, so nothing expires. Until
2026-11-08 the Worker filed each message as a Markdown file in the private repo
`nunov00/knowmark-feedback` with a fine-grained GitHub token; GitHub tokens
expire, so the owner asked for a mechanism with no recurring work. That repo is
kept as a read-only archive of the older messages (`inbox/<date>/*.md`).

Nothing goes to this public repo, a public page or GitHub Actions. There is no
admin page.

## What we store, and what we don't

The message, category, page path and time. No name, email, IP address, user
agent, cookie or device ID. The page path is stripped of query strings and
fragments.

## Abuse limits

- Per visitor: **5 messages a day** (owner's choice, 2026-10-13;
  `VISITOR_DAILY_LIMIT` in `app/src/lib/feedback.ts`). A visitor is counted
  only by a hash of their IP mixed with a random value made fresh each UTC day.
  The IP itself is never stored, and each day's random value and counters are
  deleted the next day, after which nobody can link those hashes to anyone.
- Bursts: at most 5 requests a minute per visitor (Cloudflare rate limiting
  binding `FEEDBACK_LIMITER`; IP used only as an in-memory key inside Cloudflare).
- Whole site: at most 200 messages per UTC day (`DAILY_CAP`).
- Posts from other websites are refused (Origin check), and a hidden honeypot
  field drops simple bots. Cloudflare Turnstile can be added if spam appears
  (it needs a site key and secret from the owner).

## Reviewing feedback (any agent)

Agents read D1 through Cloudflare (the Claude project's Cloudflare connector:
`d1_database_query` on `knowmark-feedback`; or `wrangler d1 execute
knowmark-feedback --remote` with an account token). When the owner asks:

1. Read new messages:
   `SELECT id, created_at, category, page, message FROM feedback WHERE status = 'new' ORDER BY id DESC`
   (drop the `WHERE` to see reviewed ones too). Check the archive repo's
   `inbox/` as well while it still has files.
2. Summarise and classify them for the owner (themes, bugs, wrong questions,
   ideas worth doing), with message ids so the owner can refer to them.
3. Mark what you summarised: `UPDATE feedback SET status = 'reviewed' WHERE id IN (...)`.
4. Delete messages the owner agrees are old or useless:
   `DELETE FROM feedback WHERE id IN (...)` (archive files: delete them in that
   repo with a commit message naming the files only).

Keep what you read private: don't copy feedback into this repo, its PRs,
issues, Actions logs or any public place. Turning feedback into work means
describing the fix ("question cissp-d1-1.2-0007 has two defensible answers"),
not quoting the visitor.

Nothing is scheduled (AGENTS.md: no automation without the owner's approval). A
weekly summary routine is easy to add if the owner wants one.

## Setup

Nothing for the owner to do. The D1 database and its permission on the deploy
token were set up on 2026-10-13. The old Worker secret `FEEDBACK_GITHUB_TOKEN`
and its GitHub token are no longer used; the owner can delete both (Cloudflare:
Workers & Pages, `cert-practice-engine`, Settings, Variables and Secrets;
GitHub: Settings, Developer settings, Personal access tokens) or let the token
expire.
