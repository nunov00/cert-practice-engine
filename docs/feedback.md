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

Each message becomes **one Markdown file in the private repo
`nunov00/knowmark-feedback`**:

```
inbox/2026-10-13/20261013T101500Z-42.md
---
received: 2026-10-13T10:15:00.123Z
category: idea # Idea or suggestion
page: /exams/cissp
---

The message text.
```

The Worker writes it with the GitHub contents API using the Worker secret
`FEEDBACK_GITHUB_TOKEN` (repo set by `FEEDBACK_REPO` in `app/wrangler.jsonc`).
Messages first go into a small D1 outbox (`knowmark-feedback`, table
`feedback`) and are filed into the repo right after the visitor gets their
"thanks"; any that can't be filed yet (for example before the token exists)
stay in the outbox and are filed on a later send. Re-filing is safe: a file that
already exists counts as done.

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

When the owner asks:

1. Read the files under `inbox/` in `nunov00/knowmark-feedback` (newest
   folders first).
2. Summarise and classify them for the owner (themes, bugs, wrong questions,
   ideas worth doing), with file names so the owner can refer to them.
3. Delete files the owner agrees are old or useless, in that repo, with a
   commit message naming the files only.

Keep what you read private: don't copy feedback into this repo, its PRs,
issues, Actions logs or any public place. Turning feedback into work means
describing the fix ("question cissp-d1-1.2-0007 has two defensible answers"),
not quoting the visitor.

Nothing is scheduled (AGENTS.md: no automation without the owner's approval). A
weekly summary routine is easy to add if the owner wants one.

## One-time setup (owner)

1. **Private repo:** create `nunov00/knowmark-feedback` on GitHub, **Private**,
   with a README.
2. **Token for the site:** GitHub, Settings, Developer settings, Personal access
   tokens, **Fine-grained tokens**, Generate new token. Repository access: *Only
   select repositories*, `knowmark-feedback`. Permissions: **Contents: Read and
   write** (nothing else). Pick the longest expiry you're comfortable with and
   note the date: when it expires, messages wait in the outbox until a new
   token is added.
3. **Give it to the site:** Cloudflare, Workers & Pages, `cert-practice-engine`,
   Settings, Variables and Secrets, Add, type **Secret**, name
   `FEEDBACK_GITHUB_TOKEN`, value the token. Never put it in a repo or chat.
4. **Give agents access:** add `knowmark-feedback` to the Claude project's
   repositories; give Codex (or another worker) access to it the same way you
   give it this repo. Remove a repo from an agent to revoke its access.

The D1 database and its permission on the deploy token were set up on
2026-10-13.
