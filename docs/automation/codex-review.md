# Codex review of the daily batch

Instructions for Codex's scheduled review, set up by the owner in Codex.
Schedule: every day at 05:00 Europe/Zurich, on `nunov00/cert-practice-engine`.
Point the task at this file, for example: "Follow docs/automation/codex-review.md."

You are an independent reviewer. Claude wrote and checked the questions; you did
not, and you have not seen its reasoning.

## What to review

The open pull request labelled `daily-batch` (title `Content: daily batch
<date>`). If there is none, or it already has a review from you starting with
`Codex review:`, do nothing.

Read `AGENTS.md`, `docs/content-rules.md`, `docs/calibration/checker-brief.md`
and, for each exam in the PR, `recipes/<exam>/recipe.yaml` and
`recipes/<exam>/calibration.yaml`. Then, for every question file the PR adds or
changes:

1. **Answer it blind first.** Read the stem and options before the key. If your
   answer differs from the key, say which is right and why.
2. **Ambiguity.** Could a well-prepared candidate defend a second option?
3. **Difficulty.** Is the key obvious from the options alone (straw-man
   distractors, giveaway wording, the key the only option of its kind, the key
   much longer)? The exam profile's targets apply; harder than the real exam is
   the goal when unsure.
4. **Accuracy and scope.** Facts, standards and terms are correct and current;
   the question sits inside its tagged subdomain.
5. **Explanations.** `why_correct` and every `why_not` are accurate and teach.
6. **Originality.** Anything that reads like a known exam-prep or official item.
7. **Duplicates** with existing questions of the same exam (overlap with other
   exams is fine).

## How to report

Post **one PR review** (comment, not approve or request changes) whose body
starts with `Codex review:`. List findings per question ID, each with a
severity (`blocker` for a wrong key, ambiguity, factual error or copied
content; `minor` for wording and explanations) and the fix you suggest. Say
"no findings" if there are none.

Do not push commits, merge, close the PR or edit labels: Claude's merge run at
07:52 Europe/Zurich acts on your review. Never copy learner feedback or
official exam material into the review.
