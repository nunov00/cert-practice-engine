# Daily question batch

**Status: scheduled.** Approved by the owner on 2026-10-18: "schedule a daily
task for this project ... for each existing exam, if it is under the ideal
question pool size, add 10 questions; if all exams already have the ideal pool
size, suggest a new exam, at the moment only security related." The owner also
agreed to an independent Codex review between opening and merging.

**Batch size: 100 questions per night, split evenly across the active exams
still under target** (owner: 50 on 2026-10-18, raised to 100 on 2026-10-19
after the first night used about 3% of the plan allowance), larger shares
first to the exams furthest below target: with three exams that is 34, 33 and
33; with one, all 100. The owner watches usage and may change it.
**AAIG is paused** until ISACA publishes its outline, because its
questions will need remapping to the real domains; a paused exam counts as at
target for step 3.

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
   proposing the top candidate in [`../exam-candidates.md`](../exam-candidates.md):
   issuer, why it ranks first, the official outline and public samples
   available for calibration, and the expected bank target. Building it waits
   for the owner. Go on to step 6 for the queue, then open the PR without
   questions.
4. **Otherwise, split the night's 100 questions across the exams under target (AAIG excluded)** and write each exam's share, following
   [`generation.md`](generation.md), the writer brief and
   `recipes/<exam>/calibration.yaml`. Spread them over the domains furthest
   below their weighted share of the target (largest `gap` first), so empty
   domains (CISSP D2-D8 today) fill first. Run ID:
   `<YYYY-MM-DD>-daily-<exam>`. Never more than 100 in total per night,
   top-ups in step 5 aside. **Aim for at least 40% hard** in each exam's
   share, above the profile's `hard_share_min` (30%), because the checker
   downgrades labels that turn out easier than written.
5. **Check them independently** per [`quality-check.md`](quality-check.md) and
   the checker brief: a separate worker with no access to the writer's
   reasoning runs `pnpm calibration packets` and `pnpm calibration record`.
   Rewrite or drop what fails; 2-3 rounds are normal. A batch with fewer
   survivors than planned is fine; do not pad it.
   **Hard top-up** (owner, 2026-10-19): if an exam's checked share of `hard`
   questions is below its profile's `hard_share_min`, write new hard
   questions for that exam to replace the downgraded ones (up to 10 extra per
   night across all exams) and send them through the same independent check.
   If the share is still short, drop that exam's easiest questions until it
   meets the target. CI fails a batch of 10 or more changed questions per exam
   below the target, so never relabel a question `hard` to pass it.
6. **Refresh the exam candidate queue** (owner, 2026-10-18) in
   [`../exam-candidates.md`](../exam-candidates.md), lightly: re-check the one
   row with the oldest Checked date (or a *to verify* row first) against the
   issuer's official page and public demand data, fix its format and scores,
   drop the *to verify* mark once checked, re-rank, and log the change in the
   Changes table with sources. Replace a row only when a new security exam
   would outrank the bottom one; keep exactly 10. Public sources only, never
   braindump sites.
7. `pnpm check` and `pnpm validate --since origin/main` must pass.
8. Open **one PR for the day**, labelled `daily-batch`, on the branch the
   session assigns (else `content/daily/<YYYY-MM-DD>`), titled
   `Content: daily batch <YYYY-MM-DD>`. Fill the template's content section per
   [`publishing.md`](publishing.md) for each exam, including the difficulty
   calibration note, plus one line on the queue change, and end the
   description with the **Codex review** section below. `Review class: routine`.

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
4. **If Codex has not reviewed,** add a line to the PR description: "No Codex
   review: none posted by the merge run."
5. **Final independent Claude review** (owner, 2026-10-18), after Codex's
   findings are handled. Start a fresh Agent worker that has not seen the
   writer's, checker's or Codex's reasoning. To keep cost down it reviews the
   questions Codex flagged plus a random sample of 5 more per exam (all of them
   if Codex did not review), against the same list as [`codex-review.md`](codex-review.md)
   (blind answer before the key, ambiguity, options-only difficulty, accuracy
   and scope, explanations, originality, duplicates) and returns findings per
   question ID. Fix or drop what is real, re-run the checks, and record a
   one-line result in the PR description ("Final Claude review: N findings, M
   fixed, K dropped"). A question with a disputed key that cannot be settled
   is dropped from the batch, not merged.
6. When CI is green, squash-merge and run the `deploy` workflow on `main`
   (standing delegation in `PROJECT.md`). If CI stays red after a fix attempt,
   leave the PR open and say why in the run summary.
7. The run summary says what shipped: questions per exam, Codex and final
   review findings handled, and the new published totals.

## Limits

- No new secrets, and nothing beyond the free GitHub and Cloudflare plans
  (`docs/platform-limits.md`). One CI run per push and one deploy per day.
- Never edit recipe weights or domains, the calibration targets, or a validator
  to get a batch through.
- Changing the schedule, the batch size or the ideal pool size needs the owner.
