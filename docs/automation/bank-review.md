# Periodic bank review

**Status: documented, not scheduled.** Runs by hand until the owner approves
scheduling (roadmap phase 6).

Questions go stale in three ways: the issuer changes the outline, practice moves
on (a standard, law or framework is revised), or the bank drifts away from the
recipe's weights and mix. Each has its own check. All of them end in pull
requests the owner reviews; nothing changes the live bank on its own.

## 1. Outline change (monthly)

`outline-watch.md`: compare each recipe with the issuer's public outline. A
change becomes an owner-approved recipe PR that cites the outline. After it
merges, `pnpm validate` warns on every question still tagged with the old
`outline_version`, and those questions go through the re-check in §2 as one
batch, ahead of the normal rotation.

## 2. Currency re-check (rolling, every published question once a year)

Each quarter, per exam, take the quarter of published questions that were
checked longest ago (questions flagged by §1 or by learners go first). A
checker session that did not write them re-runs `quality-check.md` and adds:

- **Current practice.** Are the standards, laws, frameworks and version numbers
  it relies on still current (for example a revised NIST or ISO publication, or
  a new regulation for AAIR)? Is the keyed answer still the best one today?
- **Current outline.** Does it still fit its subdomain under the recipe's
  current outline? If the subdomain was renamed, split or moved, map it.

Outcome per question:

- **Still good:** set `provenance.reviewed_on` to today and `outline_version` to
  the current one.
- **Small fix** (wording, an updated reference, a sharper explanation; same
  concept and same key): fix it, set `reviewed_on`.
- **Concept outdated, key changed, or out of scope:** set `status: retired` and
  write a replacement with a new ID through the normal pipeline. IDs are never
  reused or deleted.

One PR per exam per quarter: `Review: <exam> <yyyy>-Q<n>`, with counts per
outcome, the reason for every fix and retirement, and 3 to 5 "still good"
questions as a spot-check sample.

## 3. Balance audit (quarterly, same PR)

From `pnpm coverage` and the bank itself, per exam:

- published questions per domain against the recipe weights, and per subdomain
  against `target_questions`;
- difficulty mix against `bank.difficulty_mix`;
- question types against `format.question_types`;
- answer-key position spread and the key-is-longest bias;
- retirements from §2 that left a subdomain short.

The PR lists the gaps; they become the next generation runs (proposed in the
weekly digest). The audit itself changes no questions.

## 4. Learner signals (continuous, once phase 5 ships)

The report-question button and the stats flags in the recipe
(`retire_if_report_rate_above`, `flag_if_common_wrong_answer_above`) raise
individual questions between rotations. Each becomes a `fix/<question-id>` PR
(`publishing.md`) and is listed in the weekly digest.

## What has to be built first

- `provenance.reviewed_on` (date) in the question schema; the checker sets it
  at publish too, so the oldest-first rotation has a date to sort on.
- A `pnpm review -- <exam>` command that prints this quarter's batch and the
  balance audit.

Cost: a few minutes of Actions per run; well inside the free plan.
