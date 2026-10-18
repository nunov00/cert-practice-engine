# Daily question batch

**Status: scheduled.** Approved by the owner on 2026-10-18: "schedule a daily
task for this project ... for each existing exam, if it is under the ideal
question pool size, add 10 questions; if all exams already have the ideal pool
size, suggest a new exam, at the moment only security related." The owner also
agreed to an independent Codex review between opening and merging.

Two Claude scheduled tasks and one Codex scheduled task run every day
(times are Europe/Zurich):

| Time | Who | Run |
|---|---|---|
| 01:47 | Claude | **Batch run**: write, check and open the PR (below) |
| 05:00 | Codex (owner's schedule) | **Review run**: [`codex-review.md`](codex-review.md) |
| 07:52 | Claude | **Merge run**: act on the review, merge, deploy (below) |

The ideal pool size of an exam is its recipe's `bank.target_total` (10 times
the exam's maximum length: 900 for AAIR, AAISM and AAIG, 1500 for CISSP; owner,
2026-10-18). An exam is under it when `pnpm coverage -- <exam>` shows fewer
published questions than the target.

## Batch run

1. Start from the latest `main`. If an open PR labelled `daily-batch` exists,
   stop and say so in the run summary: one batch at a time.
2. Run `pnpm coverage -- <exam>` for every exam in `recipes/`.
3. **If every exam is at its target**, write no questions. Open (or update, if
   one is already open) one GitHub issue labelled `new-exam-suggestion`
   proposing one new security-related multiple-choice certification exam:
   issuer, why it fits the platform, the official outline and public samples
   available for calibration, and the expected bank target. Building it waits
   for the owner. Stop.
4. **Otherwise, for each exam under its target, write 10 questions**, following
   [`generation.md`](generation.md), the writer brief and
   `recipes/<exam>/calibration.yaml`. Spread them over the domains furthest
   below their weighted share of the target (largest `gap` first), so empty
   domains (CISSP D2-D8 today) fill first. Run ID:
   `<YYYY-MM-DD>-daily-<exam>`. Never more than 10 per exam per day.
5. **Check them independently** per [`quality-check.md`](quality-check.md) and
   the checker brief: a separate worker with no access to the writer's
   reasoning runs `pnpm calibration packets` and `pnpm calibration record`.
   Rewrite or drop what fails; 2-3 rounds are normal. A batch with fewer than 10
   survivors is fine; do not pad it.
6. `pnpm check` and `pnpm validate --since origin/main` must pass.
7. Open **one PR for the day**, labelled `daily-batch`, on the branch the
   session assigns (else `content/daily/<YYYY-MM-DD>`), titled
   `Content: daily batch <YYYY-MM-DD>`. Fill the template's content section per
   [`publishing.md`](publishing.md) for each exam, including the difficulty
   calibration note, and end the description with the **Codex review** section
   below. `Review class: routine`.

Codex review section to paste into the PR:

```
## Codex review

Codex: review this PR per docs/automation/codex-review.md and post one PR
review whose body starts with "Codex review:". Claude's merge run reads it
after 06:30 Europe/Zurich.
```

## Merge run

1. Find the open PR labelled `daily-batch`. If there is none, stop.
2. Read every review and comment on it. A review or comment whose body starts
   with `Codex review:` is the Codex review.
3. **If Codex reviewed:** treat each finding as a claim to verify. Fix what is
   real (a wrong key, an ambiguous question, a giveaway distractor, a scope
   miss) on the PR branch, or drop the question; reply on each finding with what
   was done or why not. Re-run `pnpm check` and `pnpm validate --since
   origin/main` before pushing.
4. **If Codex has not reviewed,** merge on the internal checker alone and add a
   line to the PR description: "Merged without Codex review: none posted by
   the merge run."
5. When CI is green, squash-merge and run the `deploy` workflow on `main`
   (standing delegation in `PROJECT.md`). If CI stays red after a fix attempt,
   leave the PR open and say why in the run summary.
6. The run summary says what shipped: questions per exam, Codex findings
   handled, and the new published totals.

## Limits

- No new secrets, and nothing beyond the free GitHub and Cloudflare plans
  (`docs/platform-limits.md`). One CI run per push and one deploy per day.
- Never edit recipe weights or domains, the calibration targets, or a validator
  to get a batch through.
- Changing the schedule, the batch size or the ideal pool size needs the owner.
