# Difficulty calibration standard

Every exam is calibrated before its first question is written, and every new or
changed question is checked against that calibration before it is published.
This page is the standard; the briefs for the two roles are
[`writer-brief.md`](writer-brief.md) and [`checker-brief.md`](checker-brief.md).

Owner rules (2026-10-16): calibrate on the issuer's **official** outline and
public sample questions only, never on brain-dump, leaked or third-party
material, and never copy them. When unsure, pitch **slightly harder** than the
real exam so learners over-prepare. Say in each content PR how it was calibrated.

## What is automatic

| Check | Where | Blocks the PR? |
|---|---|---|
| Every recipe has `recipes/<exam>/calibration.yaml`, valid against its schema | `pnpm validate`, CI | Yes |
| Profile built on an older outline than the recipe's | `pnpm validate`, CI | Warning: recalibrate |
| Giveaway wording only in distractors (absolute words, "since/because" clauses) | `pnpm validate --since`, CI | Yes, on new or changed questions; warning on the rest of the bank |
| Key more than 1.5x longer than every distractor | same | Same as above |
| New or changed published question has `provenance.options_only` from the checker | same | Yes |
| Share of new or changed questions obvious from the options alone, per exam | same | Yes, above the profile's `options_only_obvious_max` once 10 or more are checked; warning below 10 |
| Share of new or changed questions labelled hard, per exam | same | Yes, below the profile's `hard_share_min` once 10 or more changed questions of an exam are published (owner, 2026-10-19); warning below 10 |
| Stem length outside the profile's `stem_words` range | same | Warning |
| Whole-bank statistics against the profile | `pnpm calibration [exam]` | No, a report |

CI compares the PR with its base branch (`--since origin/<base>`), so only what
the PR adds or edits is held to the strict rules. Retired questions are exempt.

**What is not automatic, and why.** The options-only test needs a model to
answer the questions, and running one in CI would need an API key. The owner
wants no new secrets, so the test is run by the independent checker session in
the content run (`checker-brief.md`). CI then enforces that it was run and that
the result meets the target, from the `provenance.options_only` field the
checker records.

## The profile: `recipes/<exam>/calibration.yaml`

Schema: [`recipes/_schema/calibration.schema.json`](../../recipes/_schema/calibration.schema.json).

- `sources`: the official outline, sample questions and guidance used, each with what it was used for.
- `unavailable`: official material that exists but could not be read, and what to do when it can.
- `method`: how the calibration was done, in a few sentences. Content PRs can quote it.
- `official_profile`: the **structure** of the official samples, never their wording:
  stem length, share of scenarios, qualifiers (MOST/BEST/FIRST), option length
  and form, how distractors fail, and the mix of recall, application and judgment.
- `targets`: the numbers CI and the report check.
- `writer_notes`: exam-specific lessons for writers and checkers.
- `history`: each calibration or rework run with its PR and options-only result.

Default targets, used by every exam so far:

| Target | Value | Why |
|---|---|---|
| `options_only_obvious_max` | 0.40 | The 2026-10 rework standard. ISACA's own AAISM quiz scores 58% under the same test, so 40% is harder than the real thing |
| `hard_share_min` | 0.30 | The recipe's `difficulty_mix`, and "harder when unsure" |
| `key_only_longest_max` | 0.25 | Chance with four options: length must not hint |
| `stem_words` | 12 to 80 | Official stems run about 14 to 24 words; our scenarios may be longer, but not padded |

## Calibrating a new exam

Do this in the PR that adds the recipe; CI fails the recipe without it.

1. **Collect official material only.** The issuer's outline, its free practice
   quiz or sample questions, and its public guidance on the exam format. For
   ISACA: `isaca.org/credentialing/<exam>/practice-quiz`. If the exam has no
   samples yet, use the closest sister exam from the same issuer as a proxy and
   say so under `unavailable`.
2. **Profile the structure.** For each official item record stem length,
   scenario or direct, qualifier, option length and parallelism, cognitive
   level, and how each distractor fails. Record only these features in
   `official_profile`. Never store or paraphrase the items.
3. **Score the official items.** Run the options-only test (checker brief,
   phase 1) on the official items, with a checker who has not seen them. That
   gives the real exam's own guessability, as the AAISM baseline (7/12) did.
   Set `options_only_obvious_max` at or below it, and never above 0.40.
4. **Write the profile** with the default targets unless the official profile
   argues for different ones; say why in the PR.
5. **Write and check questions** with the briefs. Add a `history` entry with
   the PR and result.

When the issuer publishes a new outline or new samples, update the recipe,
then redo steps 2 to 4 and bump `outline_version` in the profile. `pnpm
validate` warns until you do.

## Running a content batch

`docs/automation/generation.md` and `quality-check.md` give the full run. The
calibration part:

1. Writer reads the profile and `writer-brief.md`, writes, and runs
   `pnpm validate --since origin/main` until there are no calibration errors.
2. Checker runs `pnpm calibration packets --since origin/main --out <dir>`,
   answers `1-options-only.md` before opening `2-full.md`, and writes
   `answers.yaml`.
3. `pnpm calibration record <dir>/answers.yaml` writes `provenance.options_only`
   into each question and prints the table for the PR.
4. Questions that were obvious go back to the writer. Repeat until the batch
   meets the target. Two or three writer rounds were normal in the 2026-10 rework.
5. The PR's "Difficulty calibration" section quotes the profile's `method`,
   the options-only table, the hard share and the number of rounds.

## What makes a question too easy

From the 2026-10-16 audit (`reviews/difficulty-calibration/2026-10-16-audit.md`
in the project files) and the rework PRs #34 to #42:

- **Straw-man distractors:** overreaction (suspend everything), abdication (let
  the vendor decide), irrelevant measures (page counts, programming language).
- **One-sided wording:** absolute words or "since…" clauses only in distractors.
- **The lone umbrella key:** the key is the only option at principle,
  governance or root-cause level, or the only one in its form.
- **Bundled keys:** "both X and Y", or "investigate first" when the others act.
- **Stems that point at the key:** the stem paraphrases it or rules the other
  options out one by one.
- **A repeated stem device:** the same kind of deciding fact across a batch
  (for example "X is already in place", always killing a distractor, or the key
  always being the "before approval" option) becomes a rule learners can apply
  without thinking. Vary it; the checker looks at the batch as well as each item.
- **Labels that follow length:** hard means two or more strong distractors that
  only a stem detail separates, not a long stem. A computed figure (a formula,
  plain arithmetic, a ratio) is `medium` at most (owner, 2026-10-26).

What works:

- **Near-miss distractors in the same form and level as the key:** right topic
  but wrong layer, too narrow, a later step, detective instead of preventive,
  or missing the stated constraint.
- **The reflex answer as a distractor:** include the answer a well-read
  candidate picks on reflex, ruled out by a stem fact ("already in place", or it
  does not reach the failure described).
- **A deciding fact in the stem:** the key holds only because of it.
