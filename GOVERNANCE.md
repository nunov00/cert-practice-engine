# Project governance — v0.3

## Principles
The repository is the source of truth. The Owner decides product direction, material architecture, costs, privacy/security policy and governance. The Manager (normally ChatGPT) plans, coordinates and handles routine technical decisions. Workers implement; reviewers challenge changes. Roles are interchangeable, but self-review is not independent review.

Maximise progress within approved scope. During product development, prioritise working software, rapid experimentation and short feedback cycles. Agents may refine implementation, UX details and technical approaches within approved objectives; complete reasonable fixes and refinements without treating each discovery as new scope. Do not repeatedly seek approval for implementation details, testing, review remediation or an already authorised merge. Do not expand scope or bypass gates. Keep solutions proportionate and avoid bureaucracy.

## Shared resource stewardship
GitHub and Cloudflare are used across multiple projects. Architecture and automation decisions should account for aggregate CI, build, deployment, storage, request and background-job consumption. Prefer efficient solutions without compromising product outcomes, security, reliability or maintainability. Verify current quota scope and usage; obtain Owner approval before adding paid capacity. See `PROJECT.md` for planning constraints.

## Personal data and secrets
Repositories, PRs, issues, CI logs and deployed sites can become public, and git history keeps everything. Applies in every profile:
- Never commit or publish secrets: API keys, tokens, passwords, private keys, `.env` or `.dev.vars` files. Keep them in GitHub or hosting secrets.
- Never put the Owner's or anyone else's personal data in a repository, PR, issue, log or deployed site: personal email addresses, phone numbers, home address, location, devices, identity or account numbers, real financial or health details. Refer to the Owner by their GitHub handle. Use placeholders such as `name@example.com` in examples and tests.
- Commit with a GitHub noreply address (`<id>+<user>@users.noreply.github.com`). Agents commit under their own noreply identity.
- Data a site publishes must not carry personal data even when the repository is private.
- If personal data or a secret is found, tell the Owner at once. Rotate a leaked secret first. Removing data from history means rewriting it, which is a mandatory change.

**Enforcement:** `.github/workflows/privacy.yml` runs on every PR and fails if a PR commit uses a non-noreply email, if any PR commit, merges included, adds a real email address to a file, a file name or a commit message (checked commit by commit, since history keeps what a later commit removes), or if gitleaks finds a secret in the PR's commits. Its log names commits and counts only, never paths or addresses. It is a heuristic, not proof of absence. A repository-specific `.gitleaks.toml` may allowlist a known false positive only for a named file AND an exact line shape, with a comment saying why, and list passing and failing lines for it in `.github/privacy-selftest-cases` so the self-test (`templates/github/privacy-check-selftest.sh` in nunov00/project-governance) proves the exception is narrow; never allowlist a value pattern globally. **Owner account settings** (once, in GitHub → Settings → Emails): "Keep my email address private" and "Block command line pushes that expose my email".

## Profiles and controls
The active profile is recorded in `PROJECT.md`. A profile is a preset of the controls below, and this table is the single definition of what each profile requires.

`PROJECT.md` may record **control overrides**: lasting, Owner-approved changes to one control, such as "Standard, but release approval as in Strict". An override does not change any check or GitHub setting by itself. The PR that adds it must also make the matching CI or ruleset change (or state that none is needed) and add a row to the profile history. For a temporary exemption, such as no approvals during one feature, use a review waiver instead.

| Control | Lightweight | Standard | Strict |
|---|---|---|---|
| Typical stage | PoC, experiment, early pilot | Pilot, normal production | Sensitive, high-risk or regulated production |
| Branch and PR into `main` | Preferred; direct pushes allowed for trivial edits | Required | Required |
| Approvals | None required | Required for **material** changes | Required for **every** PR |
| Who may approve | — | An agent other than the author, or the Owner | An agent other than the author (different provider for mandatory changes), or the Owner |
| Copilot PR review | Optional, advisory | Recommended, advisory | Recommended; substantive findings resolved |
| Required CI checks | None; run focused tests locally | Tests and build | Tests, build and security checks |
| Mandatory-class changes | Owner decision recorded | Agent approval and Owner decision recorded, unless explicitly approved by the Owner | Different-provider agent approval and Owner decision recorded, unless explicitly approved by the Owner |
| Waivers | Not needed | Allowed | Allowed |
| Release | Flexible, verified | Green checks before production | Green checks and explicit Owner release approval |
| Records | Brief PR notes | Significant decisions documented | Formal risk, decision and review trail |

Critical safeguards apply in every profile, whatever the overrides: never commit secrets or personal data (see Personal data and secrets), and never run destructive or data-loss operations on shared or production data without explicit Owner approval.

## Change classification
Every PR into `main` states its class in the description (`Review class: routine | material | mandatory`). Classify by highest risk, not diff size; splitting work cannot avoid a gate. When unsure, choose the higher class.

- **Routine:** narrow, reversible, no material trigger. Examples: docs, tests, refactors without behaviour change, styling and copy, contained bug fixes, patch-level dependency updates.
- **Material:** hits any of these triggers:
  - authentication, authorisation, permissions or other security-relevant code;
  - data schema, migrations, retention or deletion;
  - public APIs, contracts or integrations with external services;
  - CI/CD, deployment, infrastructure or environment configuration;
  - a new runtime dependency, or anything that adds or increases cost;
  - a user-visible production behaviour change that is hard to reverse (not behind a disabled flag);
  - a significant or hard-to-reverse architectural choice;
  - any path listed under **Material paths** in `PROJECT.md`.
- **Mandatory:** material changes to governance authority, approval requirements or safeguards; secrets handling; weakening CI gates or permissions; destructive or data-loss changes; major architecture, dependencies or costs; production publication safeguards. Mandatory changes always need a recorded Owner decision (see Approvals) and cannot be covered by a waiver.

Staged inactive scaffolding may be classified at the point it is activated (the integration PR), provided it has no effect until then.

## Approvals
GitHub does not let you approve your own PR, and AI agents usually act through the Owner's account, so approvals are recorded as **PR comments in a fixed format**:

```
APPROVED · reviewer: <agent> (<provider>) · author: <agent> (<provider>) · commit <sha>
<one-line summary of what was checked and any remaining findings>
```

Rules:
- The implementing agent names itself in the PR description (`Author agent: <agent> (<provider>)`).
- The reviewer must be a different agent from the author. For mandatory changes in Strict, it must be a different provider.
- **The Owner steers; agents review code.** The Owner is never asked to review or approve code. For a mandatory change, the Owner decides *what* is done (for example "yes, add the paid service" or "go ahead with the new governance rule"), in chat, before or during the work. The agent records it in the PR description as `Owner decision: "<the Owner's words>" (<date>)`, or links the issue or earlier PR where it was recorded. One decision can cover several PRs that carry it out. Code review stays with the agent reviewers.
- An approval covers only the named commit. Any later push needs a new approval.
- Copilot PR review never counts as an approval: GitHub only lets it leave comments, it reviews the diff rather than the design, and it is not independent if it helped write the code.
- The Owner may approve any PR directly, with or without an agent review, usually in chat. That approval stands on its own, for mandatory changes too, and also counts as the Owner decision. The agent then records it on the PR in the same format (`reviewer: Owner (chat)`), followed by the Owner's words and the date. An Owner approval covers the commit that was current when it was given.
- Never post an approval you did not perform, or on behalf of another agent.

The agent named in a comment is self-declared, since comments come from the same account. This convention guards against mistakes, not deliberate misuse. Standard and Strict projects can enforce it with the approval check in [`templates/github/`](templates/github/README.md).

## Waivers and bypasses
The Owner can always bypass a gate, either for a single PR or for a defined scope.

The Owner may grant either in chat; the agent then records it on GitHub, quoting the Owner's words and the date, before relying on it.

**Single PR:** the PR is merged using the ruleset bypass (by the Owner, or by an agent the Owner told to), and the PR description records `Bypass: <reason> (Owner, <date>)`.

**Review waiver (for a feature or other scope):** a GitHub issue labelled `review-waiver`, opened by the Owner or by an agent on the Owner's instruction. Its body uses these lines:

```
Scope: <feature or purpose>
Branches: `<branch glob>`, ...
Waives: approvals (CI checks still apply)
Reason: <why>
Ends: <YYYY-MM-DD>
```

A waiver is identified by its issue number, which is never reused. It applies only while all of these hold: the issue is open, it has the `review-waiver` label, today is on or before `Ends`, and the PR's branch matches one of `Branches`. So an old waiver cannot be picked up by mistake: once it is closed or past its end date, or the PR comes from another branch, the approval check ignores it. Use a branch name specific to the feature (for example `feature/login*`, not `feature/*`).

PRs within scope reference it (`Waiver: #<issue>`) and may merge without approval. Immediately before merging under a waiver, re-run the approval check and confirm it passes on the current head, since an earlier green result may predate the waiver's end date. The waiver ends at its end date or when the feature merges, whichever comes first; the agent closes the issue when the feature merges. When it closes, list the PRs merged under it in the issue so the Owner can choose to review them afterwards. A waiver never covers mandatory-class changes. Agents must not create, widen or extend waivers, or bypass, on their own initiative; report any merge made under a waiver or bypass.

## Multi-agent handoffs and architecture review
Agents may divide work across providers using GitHub as the shared source of truth. The Manager coordinates boundaries and integration; an agent must not assume another agent has access to its chat history. Handoffs give the objective, relevant code/decisions, constraints, acceptance criteria and delivery expectations in proportion to complexity. Read existing interfaces and ADRs before implementing; avoid simultaneous conflicting edits.

| | Lightweight | Standard | Strict |
| --- | --- | --- | --- |
| Handoff | Brief issue/PR description; link relevant context | Explicit interfaces, dependencies, acceptance criteria and integration owner | Traceable responsibilities, contracts and validation evidence |
| Architecture challenge | Optional; seek one for hard-to-reverse proposals | Independent challenge before implementing material architecture; record trade-offs | Different-provider review of material proposals before implementation, with risk evidence |
| Decision record | Short PR note or ADR for non-obvious choices | Significant decisions, alternatives and rationale | Formal decision, risk, approval and review trail |

The Manager reconciles review findings; Owner approval remains required for material architecture, cost and other reserved decisions. If a required reviewer or tool is unavailable, do not misrepresent the review: defer the change or ask the Owner for a bypass or waiver.

## Normal workflow
Objective → feature branch → implementation and focused tests → cohesive PR into `main` → approval if the profile requires it → merge → verify deployment (if any).

Prefer one PR per completed feature or meaningful deliverable, not per implementation step. Keep unrelated or high-risk work separate, and avoid long-lived branches. PRs state what changed, why, checks run, `Review class`, `Author agent` and any remaining risks. Check the current head before merge; never merge failing required checks without an Owner bypass.

## Stages and changing profiles
`PROJECT.md` records the stage (PoC, Pilot or Production) and the profile. Typical defaults: PoC → Lightweight; Pilot → Lightweight or Standard; Production → Standard or Strict.

**Production checkpoint:** before the first production deployment, the Manager must stop and propose a profile assessment. The Owner either approves a transition or records in `PROJECT.md` why the current profile stays.

The Owner may change profile at any stage; it is an Owner decision, never an agent's. The Manager then does the whole transition in one PR (classified mandatory, with the `Owner decision:` line) plus the GitHub settings changes, in the order below. The old profile governs the transition PR; the new controls are configured and verified after it merges.

**Freeze during a transition:** from merging the transition PR until verification is complete, do not merge other PRs or release to production. If a settings change or the verification fails, the freeze stays until it is fixed or the Owner decides otherwise.

**Moving up (for example Lightweight → Standard, or Standard → Strict)**
1. In the transition PR: update `Governance profile` and `Stage` in `PROJECT.md`, add a row to the profile history, and set `Material paths` for the project.
2. In the same PR, if not already present: copy `templates/github/workflows/governance-approval.yml` into `.github/workflows/`, and add the CI jobs the new profile requires (tests and build; security checks for Strict).
3. Merge it. The check reads the profile from `main`, so the transition PR is judged under the old profile, and the new rules apply from the next PR.
4. After the merge: create the `review-waiver` label, then change the ruleset as in **GitHub settings per profile** (require a PR, add `governance/approval` and the CI jobs as required checks, Owner on the bypass list). Add the required checks after they have run once, so GitHub suggests their exact names.
5. Reassess every open PR targeting the affected branch: add `Review class:` and `Author agent:` where missing, then re-run the approval check on each one, because a green result from before the transition was judged under the old profile. Get any approvals the new profile now requires.
6. Verify both sides with a test PR: without approval it is blocked (marked `material` in Standard, `routine` in Strict); after a valid approval, with green CI, it passes. Then close it and report the result to the Owner. A check that only ever blocks may be broken rather than enforcing.

**Moving down (for example Strict → Standard, or Standard → Lightweight)**
1. In the transition PR: update `Governance profile` and `Stage` in `PROJECT.md` and add a row to the profile history, including why the lower profile is now enough. It is a mandatory change judged under the current, higher profile.
2. Merge it, then relax the ruleset to the destination profile's settings. Keep "block force pushes and deletion" in every profile.
3. Apply what the destination profile needs:
   - **To Standard:** the approval check still applies, now to material and mandatory PRs only. Keep it and its required status, keep waivers in use, and re-run the check on open PRs so routine ones turn green.
   - **To Lightweight:** the check now passes every PR. It can stay in place for a later move back up, or be removed if CI minutes matter. Close any open `review-waiver` issues, since they are no longer needed.
4. Verify that the destination profile behaves as expected (for Standard: a routine test PR passes and a material one is blocked until approved), then report to the Owner.
5. If the project already runs in production, keep the protections that guard production branches, deployments and data (for example CI on `main` and release checks), and record that in the profile history. A downgrade relaxes approvals, not safety.

If any step can't be completed (for example, the ruleset can't be changed), say so in the PR and to the Owner rather than reporting the transition as done.

## GitHub settings per profile
Template files do not copy rulesets or enable Copilot (the `privacy` workflow in `.github/workflows/` is copied and runs on its own); apply these in **Settings → Rules → Rulesets** for the default branch.

| Setting | Lightweight | Standard | Strict |
|---|---|---|---|
| Block force pushes and deletion | Yes | Yes | Yes |
| Require a pull request | Optional | Yes (0 required GitHub approvals) | Yes (0 required GitHub approvals) |
| Required status checks | `privacy` recommended | CI jobs + `privacy` + `governance/approval` | CI jobs + `privacy` + `governance/approval` |
| Require branches up to date | — | Optional | Yes |
| Bypass list | — | Owner (repository admin) | Owner (repository admin) |
| Automatic Copilot review | Optional | Recommended | Recommended |

GitHub's own "required approvals" stays at 0 because agents act through the Owner's account; the `governance/approval` check enforces the comment convention instead.

## Improve gradually
Editorial clarifications to governance documents are routine if they do not alter decision rights, gates or safeguards; substantive policy changes are mandatory. Amend this framework only when a concrete need emerges. Keep project-specific policies in `PROJECT.md` or separate project documentation.
