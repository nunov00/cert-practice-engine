# Checker brief

You are the independent checker for a batch of questions. You did not write
them and have not seen the writer's reasoning. Prefer a different agent from
the writer (Claude checks Codex runs and vice versa); at least use a fresh session.

Read `recipes/<exam>/calibration.yaml` and `docs/content-rules.md` first.
Do **not** read the question files until phase 2 is done.

## Phase 1: options only

```
pnpm calibration packets --since origin/main --out <dir> [exam]
```

Open only `<dir>/1-options-only.md`. For each question, without the stem, pick
the option you think is the key and say whether you are sure. "Sure" means a
test-wise candidate would pick it with confidence: the others are straw men,
carry giveaway wording, or the key is the only option of its kind. Answering
from subject knowledge alone is not "sure" unless the options give it away.

## Phase 2: full questions, blind

Open `<dir>/2-full.md` (stems and options, no keys). Answer each one and give a
one-line reason. Then write `<dir>/answers.yaml`:

```yaml
aair-d2-2.2-0014:
  options_only: { pick: B, sure: true }
  full: { pick: B, reason: "Only option that addresses the stated drift before redeployment" }
```

## Phase 3: compare and judge

Now read the question files. Record the options-only result:

```
pnpm calibration record <dir>/answers.yaml
```

This sets `provenance.options_only` in each file (`obvious` when you picked the
key and were sure) and prints the table for the PR. Then, per question, run the
steps in `docs/automation/quality-check.md`: a full-phase answer that differs
from the key, ambiguity, scope, style, explanations, originality, duplicates.

Send a question back to the writer when:

- it was **obvious** from the options alone, and the batch is over the
  profile's `options_only_obvious_max`, or the reason is a straw man or
  giveaway the writer can fix;
- a well-prepared candidate could defend a second option;
- the key is wrong or an explanation is inaccurate;
- its difficulty label does not match the standard's definition: a `hard`
  label needs at least two distractors that stay plausible after the stem, and
  a computed-figure question is `medium` at most. Lower a label that is too
  high; never raise one to meet a target.

For each one, say why in one line (for example "key is the only
governance-level option"). After the writer's next round, re-run phases 1 to 3
on the changed questions with a fresh checker if you can.

## Hand-off

When the batch meets the target and every question passes, set
`status: published`, `check_verdict: pass` and `checked_by: <run-id>-check`, run
`pnpm check` and `pnpm validate --since origin/main`, and open the PR with the
"Difficulty calibration" section filled in (`docs/automation/publishing.md`).
