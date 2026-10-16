# Content rules

These rules apply to every question, whoever writes it: a generation run, a fix
PR, or the owner by hand. The checker (`docs/automation/quality-check.md`) and
reviewers use them as the rubric.

## 1. Originality

- Write every question from scratch, from general knowledge of the subject.
- Never use, adapt or "reconstruct" official sample questions, the issuer's
  practice tests, leaked or "brain-dump" material, or third-party (vendor, book,
  course) questions. Don't reproduce a question from memory of one of those.
- Don't quote official study guides or the exam outline beyond the short
  subdomain headings already in the recipe.
- Explanations are our own words. Cite public standards (NIST, ISO, etc.) by
  name where useful; don't paste long passages from them.
- If a question resembles something the author has seen in exam-prep
  material, discard it and write a different one.

## 2. Exam-likeness (driven by the recipe's `style` block)

- Exactly one **best** answer. Distractors are plausible to a partly prepared
  candidate, but clearly worse to an expert.
- Prefer short scenarios that test judgment ("what should the manager do
  FIRST/BEST/MOST") over recall of trivia, as the recipe's `voice` says.
- No "all of the above", "none of the above", or options that overlap so that
  two are both right.
- Options are similar in length and grammar, so the answer isn't given away by form.
  The key must not be the longest, most qualified option by habit; `pnpm validate`
  warns when it is more than 1.5x longer than every distractor.
- Calibrate on the issuer's official public sample questions and outline only
  (never brain-dump or leaked sites): read them for structure, never wording.
  For the ISACA AI exams that means short stems (about 15 to 25 words for
  direct items), a capitalised qualifier, short parallel options, and a real
  share of technical AI knowledge, not only governance judgment. Aim for about
  a third short direct items and the rest short scenarios.
- Stay inside the subdomain's scope as the outline defines it. If a topic is
  only arguably in scope, choose a different one.
- The answer must not depend on a vendor product, a specific version, or a
  fact that changes often.

### Distractors

Most of an item's difficulty lives in its wrong options. A 2026-10 audit found
that the key could be picked from the options alone, without reading the stem,
in almost every AAIR and AAIG question
(`reviews/difficulty-calibration/2026-10-16-audit.md` in the project files).
So:

- **Every distractor is defensible.** It is a real practice that a competent
  professional would choose in some situation. It is wrong here because of a
  specific detail in the stem: wrong layer, too narrow, too early in the
  sequence, or it misses the stated constraint.
- **No straw men.** Avoid the three stereotypes: overreaction ("ban all AI",
  "suspend every system"), abdication ("let the vendor decide", "rely on the
  supplier's statement") and irrelevant options (page counts, programming
  language, publishing an inventory on the website).
- **No one-sided giveaway wording.** Don't put absolute words (all, every,
  never, immediately…) or self-justifying clauses ("…, since the vendor is
  accountable") only in distractors. `pnpm validate` warns when only
  distractors use them.
- **Share the vocabulary.** If the key says "risk-based", "proportionate",
  "appetite" or "accountable owner", at least one distractor uses governance
  language too, so the answer isn't the most mature-sounding option.
- **Prefer ranking items.** FIRST/MOST/BEST items where all four options are
  sound steps, and only the stem's situation decides the order or priority.
- **Options-only test.** Before submitting, cover the stem and look only at the
  options. If the key is obvious, rewrite the distractors.

## 3. Explanations

- `why_correct` says why the keyed answer is the best one, not only why it is true.
- `why_not` gives each wrong option a specific reason (why it's wrong, or why
  it's less suitable than the key).
- Explanations teach: a learner who got it wrong should understand the concept
  after reading.

## 4. Difficulty

- `easy`: one concept, direct application; one distractor is close.
- `medium`: two or more distractors are reasonable; a stem detail decides.
- `hard`: all distractors are reasonable, and the answer turns on a subtle
  priority, sequence or scoping judgment, or on several factors together.

Stem length is not difficulty. A question that can be answered from the options
alone is `easy` at most, and should be rewritten.

Generation runs aim for the recipe's `bank.difficulty_mix`.

## 5. Independence and branding

- The site is independent. Each exam page shows the recipe's `exam.disclaimer`.
- Exam names and issuer names are used descriptively only, never in the brand,
  logo or domain.
- No claims of pass guarantees or of matching the real exam's scoring.
