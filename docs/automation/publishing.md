# Publishing via pull request

**Status: scheduled daily since 2026-10-18 as part of the [daily batch](daily-batch.md); also run by hand.**

## The PR

- Title: `Content: <exam> <domain> (<run-id>)`
- Uses `.github/pull_request_template.md`, filling the content section:
  - counts per subdomain and difficulty
  - checker rejects with reasons
  - **suggested spot-check sample**: 3 to 5 random questions, linked
  - **difficulty calibration**: the profile's `method` (or what changed in it),
    the options-only table from `pnpm calibration record`, the hard share from
    `pnpm calibration <exam>`, and the number of writer and checker rounds
- Questions in the PR are `published` with `check_verdict: pass` (they go live
  only when merged); any held for the owner's call are `in_review`.
- CI must be green.

## Owner spot-check

The owner reads the sample (and anything else they like) and either:

- **merges**, which publishes them, or
- **requests changes** on specific questions; the agent fixes or drops them.

Merging to `main` is the only way a question goes live. After the app exists,
a deploy step syncs `bank/` into the database on every merge.

## Fixes to published questions

Branch `fix/<question-id>`, change the file, say in the PR what was wrong
(learner report, stats flag, owner note) and what changed. If the change alters
the tested concept, retire the old question and add a new ID instead.
