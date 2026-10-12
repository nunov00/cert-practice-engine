# Independent quality check

**Status: documented, not scheduled.**

The checker is a separate session from the generator, with different
instructions and no access to the generator's reasoning. Preferably a different
agent (Claude checks Codex runs and vice versa).

## Steps, per question

1. **Answer blind.** Read stem and options only; pick an answer and give a reason.
2. **Compare with the key.** If the blind answer differs, decide whether the key is
   wrong, the question is ambiguous, or the checker erred. Only "checker erred"
   with a clear reason passes.
3. **Ambiguity.** Could a well-prepared candidate defend a second option? Fail.
4. **Scope.** Is it inside the stated subdomain per the outline? Fail if not.
5. **Style.** Check against `docs/content-rules.md` §2 and the recipe's `style`.
6. **Explanations.** Accurate, specific for every option, and teaching.
7. **Originality.** Fail anything that reads like a known exam-prep question.
8. **Duplicates.** `pnpm validate` flags exact and near duplicates; also judge
   whether it tests the same idea as an existing question in the subdomain.

## Outcome

- **Pass:** set `status: published`, `provenance.checked_by: <run-id>-check`,
  `check_verdict: pass`. Small wording fixes are allowed; note them in the PR.
  Merging the PR is the owner's approval, so `published` on a branch is not live yet.
- **Unsure:** set `status: in_review`, `check_verdict: pass` only if every check
  passed, and list it in the PR for the owner to decide.
- **Fail:** delete the draft file from the branch and record its ID, subdomain
  and reason in the PR's rejects table. The ID is not reused.

Then run `pnpm check` and open the PR as described in `publishing.md`.
