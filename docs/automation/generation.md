# Generation run

**Status: documented, not scheduled.** Runs are started by hand until the owner
approves a schedule.

## Inputs

- `recipes/<exam>/recipe.yaml`: style, domains, subdomain targets, difficulty mix,
  `outline.version`.
- `pnpm coverage -- <exam>`: which subdomains have the largest gaps.
- `docs/content-rules.md`: the rules every question must follow.
- Existing questions in the target subdomain (stems only), to avoid repeating topics.

## One run

1. Pick one exam and one domain; choose subdomains with the biggest `gap`.
2. Create branch `content/<exam>/<run-id>` where `run-id` is
   `<YYYY-MM-DD>-<exam>-<domain>-<letter>`, e.g. `2026-10-20-cissp-d3-a`.
3. Write N questions (default 20), spread over the chosen subdomains and roughly
   matching `difficulty_mix`. Each file:
   - `status: draft`, `sample: false`
   - `outline_version` = the recipe's `exam.outline.version`
   - `provenance: { generated_by: <claude|codex>, run_id: <run-id>, check_verdict: pending }`
   - next free ID in each subdomain
4. Run `pnpm validate`; fix every error. Resolve near-duplicate warnings by
   rewriting the new question.
5. Commit and hand over to the quality check (`quality-check.md`). The generator
   does not check its own work and does not open the PR.

## Topic variety

Within a run, vary the scenario setting (industry, organisation size, role) and
the concept tested. Avoid more than two questions on the same narrow concept.
