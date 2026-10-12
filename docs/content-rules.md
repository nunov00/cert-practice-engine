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
- Stay inside the subdomain's scope as the outline defines it. If a topic is
  only arguably in scope, choose a different one.
- The answer must not depend on a vendor product, a specific version, or a
  fact that changes often.

## 3. Explanations

- `why_correct` says why the keyed answer is the best one, not only why it is true.
- `why_not` gives each wrong option a specific reason (why it's wrong, or why
  it's less suitable than the key).
- Explanations teach: a learner who got it wrong should understand the concept
  after reading.

## 4. Difficulty

- `easy`: one concept, direct application.
- `medium`: a scenario that needs choosing between two reasonable options.
- `hard`: several factors in play, or a subtle priority/sequence judgment.

Generation runs aim for the recipe's `bank.difficulty_mix`.

## 5. Independence and branding

- The site is independent. Each exam page shows the recipe's `exam.disclaimer`.
- Exam names and issuer names are used descriptively only, never in the brand,
  logo or domain.
- No claims of pass guarantees or of matching the real exam's scoring.
