# Writer brief

You write original multiple-choice questions for one exam. Read these first:

1. `recipes/<exam>/recipe.yaml`: scope, subdomains, `style`, `difficulty_mix`.
2. `recipes/<exam>/calibration.yaml`: the exam's profile, targets and `writer_notes`.
3. `docs/content-rules.md`, especially §2 "Distractors".
4. [`standard.md`](standard.md), "What makes a question too easy".
5. Stems of existing questions in the target subdomain, to avoid repeats.

## Rules

- **Original only.** Write from subject knowledge. Never use, adapt or
  reconstruct official, leaked, brain-dump or vendor questions.
- **Pitch above the official level.** When unsure whether a question is hard
  enough, make it harder.
- **Every distractor is a defensible practice** a competent professional would
  choose in some situation, at the same level of abstraction and in the same
  form as the key. It is wrong here only because of a specific stem detail.
- **Put a deciding fact in the stem**, and make sure the stem does not
  paraphrase the key or rule out the other options one by one.
- **Include the reflex answer as a distractor** where one exists, ruled out by
  the stem.
- **No one-sided wording.** No absolute words (all, every, never, immediately,
  ban…) or "since/because" clauses that appear only in distractors. Keep option
  lengths close; the key is not the only longest option by habit.
- **Vary the form.** Mix short direct items and short scenarios as the profile
  says, and include FIRST/NEXT sequencing items where all four options are
  valid steps.
- **Label honestly.** `hard` means two or more strong distractors that only a
  stem detail separates. Stem length is not difficulty.
- **Explain every option.** `why_correct` says why it is best; each `why_not`
  says why that option loses here.

## Before you hand over

1. Cover each stem and read only the options. If you can pick the key, rewrite
   the distractors.
2. Run `pnpm validate --since origin/main` and fix every error. Calibration
   cues on your questions are errors, not warnings.
3. Run `pnpm calibration <exam>` and check the hard share against the target.
4. Commit and hand over to a separate checker session. Do not check your own work.

In a rewrite round, the checker's notes say which questions were obvious and
why. Fix the cause (usually a lone umbrella key or a straw man), not just the
wording, and keep the key letter unless the checker found a wrong key.
