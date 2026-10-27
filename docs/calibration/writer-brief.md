# Writer brief

You write original multiple-choice questions for one exam. Read these first:

1. `recipes/<exam>/recipe.yaml`: scope, subdomains, `style`, `difficulty_mix`.
2. `recipes/<exam>/calibration.yaml`: the exam's profile, targets and `writer_notes`.
3. `docs/content-rules.md`, especially §2 "Distractors".
4. [`standard.md`](standard.md), "What makes a question too easy".
5. Every existing question in the target subdomain in full (stem, options,
   key and explanations, drafts included), to avoid testing the same decision
   again in new words.

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
- **Label honestly.** `hard` means two or more distractors that stay
  plausible after reading the whole stem, separated from the key only by a stem
  detail. Stem length is not difficulty, and a question answered by computing a
  figure (a formula, plain arithmetic, a ratio) is `medium` at most.
- **Explain every option.** `why_correct` says why it is best; each `why_not`
  says why that option loses here.

## Writing hard questions that stay hard

From the reviews of the 2026-10-23 to 2026-10-27 batches, where checkers,
Codex and the final review lowered most `hard` labels. Before a hard pass,
read the exam's published `hard` questions in the target domain as models of
the bar (for form only; test a different decision).

What survives review:

- **A real tradeoff.** The scenario sets two goals or constraints against each
  other, and two or more distractors are what a good professional would do in
  a slightly different situation (best practice elsewhere, wrong here).
- **One deciding detail.** A single stem fact (a requirement, a constraint, who
  owns what, what has already failed) decides between the key and its closest
  rivals. It must not name the gap or point at the key.
- **Fix the cause, not the symptom.** Strong distractors treat the visible
  symptom, add a contract or policy, or reduce data in a way the stem's purpose
  cannot accept; the key addresses where the problem actually sits.
- **Same-form options.** All four are concrete actions (or all four are
  controls, roles or documents) of similar length and specificity.

What gets a `hard` label lowered:

- Only one distractor is plausible after the stem (the others are straw men,
  "review later", "accept the risk" or an irrelevant role).
- The stem states the gap or the missing control, or lists "X is already in
  place" facts that cross options off one by one.
- The key is the lone umbrella or principle option among concrete steps, or the
  only "before approval" option, or wins by majority vote across "part 1;
  part 2" options.
- The answer is a computed figure, a definition or a recall fact (`medium` at
  most).
- It tests a decision already tested in the subdomain, drafts included.

Self-test before handing over a hard question: name the two distractors that
survive the stem, and the stem detail that beats each. If you cannot, it is
`medium`; label it so, and write another hard question instead.

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
