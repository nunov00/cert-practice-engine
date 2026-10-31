# Daily question batch

**Status: scheduled.** Approved by the owner on 2026-10-18: "schedule a daily
task for this project ... for each existing exam, if it is under the ideal
question pool size, add 10 questions; if all exams already have the ideal pool
size, suggest a new exam, at the moment only security related." The owner also
agreed to an independent Codex review between opening and merging.

**Batch size: 50 questions per night, split evenly across the active exams
still under target** (owner: 50 on 2026-10-18, raised to 100 on 2026-10-19
after the first night used about 3% of the plan allowance, back to 50 on
2026-10-23 after the 2026-10-20 run hit the weekly usage limit), larger shares
first to the exams furthest below target: with three exams that is 17, 17 and
16; with one, all 50. The owner watches usage and may change it.
**AAIG is paused** until ISACA publishes its outline, because its
questions will need remapping to the real domains; a paused exam counts as at
target for step 4.

Two Claude scheduled tasks and one Codex scheduled task run every day
(times are Europe/Zurich):

| Time | Who | Run |
|---|---|---|
| 01:47 | Claude | **Batch run**: write, check and open the PR (below) |
| 05:00 | Codex (owner's schedule) | **Review run**: [`codex-review.md`](codex-review.md) |
| 07:52 | Claude | **Merge run**: act on the review, merge, deploy (below) |

The ideal pool size of an exam is its recipe's `bank.target_total`: 6 times
the exam's maximum length, so 540 for AAIR, AAISM and AAIG and 900 for CISSP
(owner, 2026-10-31: "Yes please, make it 6x"; it was 10 times, set on
2026-10-18). Each domain gets its weight's share of the total, split evenly
across its subdomains. An exam is under it when `pnpm coverage -- <exam>` shows fewer
published questions than the target.

## Batch run

1. Start from the latest `main`. If an open PR labelled `daily-batch` exists,
   stop and say so in the run summary: one batch at a time.
2. Run `pnpm coverage -- <exam>` for every exam in `recipes/`.
3. **Re-check held drafts** (owner, 2026-10-26: "Sounds like a good plan, go
   for it"). [`bank/_held-back.yaml`](../../bank/_held-back.yaml) lists
   questions kept as `status: draft` only for the hard share, not for a fault.
   Take up to 20 a night across the exams under target, oldest first and
   `medium` before `easy`, and send them through step 6 with the night's new
   questions: the same independent check (including the duplicate check
   against today's bank) and the strict hard-label check where relevant. Fix
   what the check finds as for a new question. Once step 6 is done, publish
   them, `medium` first then `easy`, only while the exam's hard share of the
   PR's new and changed published questions stays at or above its profile's
   `hard_share_min` with them included. A released question gets
   `status: published`, `check_verdict: pass` and `checked_by: <run-id>-check`,
   and leaves the list. One that fails the recheck leaves the list too and
   stays a draft; say why in the PR. The rest stay on the list for a later
   night. Released drafts do not count toward the 50 new questions. Never
   relabel one up to make room.
4. **If every exam is at its target**, write no questions. Open (or update, if
   one is already open) one GitHub issue labelled `new-exam-suggestion`
   proposing the top candidate in [`../exam-candidates.md`](../exam-candidates.md):
   issuer, why it ranks first, the official outline and public samples
   available for calibration, and the expected bank target. Building it waits
   for the owner. Go on to step 7 for the queue, then open the PR without
   questions.
5. **Otherwise, split the night's 50 questions across the exams under target
   (AAIG excluded)** and write each exam's share, following
   [`generation.md`](generation.md), the writer brief and
   `recipes/<exam>/calibration.yaml`. Spread them over the domains furthest
   below their weighted share of the target (largest `gap` first), so empty
   domains fill first. Run ID: `<YYYY-MM-DD>-daily-<exam>`. Number new
   questions above both the files in `bank/` and `bank/_reserved-ids.yaml`;
   when a question is deleted before merge, add its ID to that list in the same
   PR. Never more than 50 in total per night, top-ups in step 6 aside.
   - **Read the subdomain first** (owner, 2026-10-26). Before writing into a
     subdomain, the writer reads every existing question in it in full (stem,
     options, key and explanations, drafts included), not just the stems, and
     does not test the same decision again with new wording. Duplicates were
     the main reason rewrites failed on 2026-10-24 and 2026-10-26.
   - **Hard pass first** (owner, 2026-10-27: "the idea is to keep the overall
     pool of questions over a certain difficulty. Therefore adding more hard
     questions would help"). Since 2026-10-24 reviewers have lowered most
     `hard` labels, so CISSP and AAIR nights published almost nothing and
     their drafts piled up on the held-back list. So each exam's share is
     written in two passes:
     1. **Hard pass.** Write 60% of the exam's share (rounded up; 11 of 17,
        10 of 16) as `hard` questions only, using the "Writing hard questions
        that stay hard" section of the writer brief, and send them through
        step 6 at once: the independent check, the strict hard-label check and
        the hard top-ups.
     2. **Fill pass.** Count the hard questions that survived (`H`). At the
        profile's `hard_share_min` (`s`, 30%), the PR can carry at most
        `H × (1 − s) / s` non-hard questions for the exam (7 for every 3
        hard). Fill that room in this order: the hard pass's questions whose
        label was lowered, then held drafts from step 3, then new `easy` or
        `medium` questions. Write the rest of the share as `hard` questions
        (a second hard round, through step 6 like the first), never as
        questions the share cannot carry. A night with spare hard share
        therefore releases held drafts instead of adding to them.
   - A question is `hard` only when at least two wrong options stay plausible
     after reading the whole stem, and only a stem detail separates them from
     the key. A question whose answer is a figure to compute (a formula, plain
     arithmetic, a ratio or a date sum) is `medium` at most, however long the
     working.
6. **Check them independently** per [`quality-check.md`](quality-check.md) and
   the checker brief: a separate worker with no access to the writer's
   reasoning runs `pnpm calibration packets` and `pnpm calibration record`.
   Rewrite or drop what fails; 2-3 rounds are normal. A batch with fewer
   survivors than planned is fine; do not pad it.
   - **Strict hard-label check** (owner, 2026-10-26). Before the PR, a second
     fresh worker that has seen neither the writer's nor the checker's
     reasoning reads every question still labelled `hard`, answers it blind,
     and keeps the label only if at least two distractors stay plausible after
     the stem, the answer is not a computed figure, and it is not the same idea
     as another question in the subdomain. Otherwise it lowers the label to
     `medium` or `easy` (lowering is always allowed; raising never is). This is
     the same bar Codex and the final review apply in the morning, so the
     labels that reach the PR should survive them.
   - **Hard top-up** (owner, 2026-10-19 and 2026-10-26): for every hard label
     lowered in this step, write a new hard question for that exam the same
     night (up to 10 extra per night across all exams), or rewrite the lowered
     one so a second distractor survives the stem, and send it through the
     same independent check and strict hard-label check. Spend the top-ups on
     the exams with the most questions on the held-back list first.
   - If an exam's share is still short, hold back that exam's easiest new
     questions until it meets the target: set them to `status: draft` (keep the
     file; never delete it or reuse its ID), add them to
     `bank/_held-back.yaml`, and list the held IDs in the PR description. This
     is a standing owner delegation (`PROJECT.md`, 2026-10-25): do it without
     asking. It is the fix CI asks for, not a CI bypass. CI fails a batch of 10
     or more changed questions per exam below the target, so never relabel a
     question `hard`, edit `calibration.yaml` targets or touch the validator to
     pass it. Questions dropped for a fault stay drafts but never go on the
     held-back list.
7. **Refresh the exam candidate queue** (owner, 2026-10-18) in
   [`../exam-candidates.md`](../exam-candidates.md), lightly: re-check the one
   row with the oldest Checked date (or a *to verify* row first) against the
   issuer's official page and public demand data, fix its format and scores,
   drop the *to verify* mark once checked, re-rank, and log the change in the
   Changes table with sources. Replace a row only when a new security exam
   would outrank the bottom one; keep exactly 10. Public sources only, never
   braindump sites.
8. `pnpm check` and `pnpm validate --since origin/main` must pass.
9. Open **one PR for the day**, labelled `daily-batch`, on the branch the
   session assigns (else `content/daily/<YYYY-MM-DD>`), titled
   `Content: daily batch <YYYY-MM-DD>`. Fill the template's content section per
   [`publishing.md`](publishing.md) for each exam, including the difficulty
   calibration note, the hard labels the strict check lowered, the held drafts
   released and still held, plus one line on the queue change, and end the
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
   miss) on the PR branch, or drop the question (set it to `status: draft`, not on the held-back
   list). If downgraded labels push an exam below `hard_share_min`, hold back
   its easiest new or released questions as in batch step 6, without asking,
   and add them to `bank/_held-back.yaml`; a held draft released in this PR
   goes back on the list. Reply on each finding with what was done or why
   not. Re-run `pnpm check` and `pnpm validate --since
   origin/main` before pushing.
4. **If Codex has not reviewed,** add a line to the PR description: "No Codex
   review: none posted by the merge run."
5. **Final independent Claude review** (owner, 2026-10-18), after Codex's
   findings are handled. Start a fresh Agent worker that has not seen the
   writer's, checker's or Codex's reasoning. To keep cost down it reviews the
   questions Codex flagged plus a random sample of 5 more per exam (all of them
   if Codex did not review; released held drafts count as new questions), against the same list as [`codex-review.md`](codex-review.md)
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
