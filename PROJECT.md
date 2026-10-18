# Project configuration

- **Project:** Cert Practice Engine (brand: Knowmark)
- **Purpose:** One engine serving self-study practice for many multiple-choice certification exams, each defined by a recipe, with original, independently checked questions.
- **Owner:** Nuno Vitoria (`nunov00`)
- **Manager:** Claude (the project's coordinator in Claude Projects); Codex also works in this repo under the same rules
- **Governance template:** v0.2 (from `nunov00/project-governance` at f22bfe9, retrofitted 2026-10-17)
- **Stage:** Pilot
- **Governance profile:** Lightweight
- **Technology:** Next.js on Cloudflare Workers via `@opennextjs/cloudflare`, Cloudflare D1; TypeScript content CLI in `tools/`; YAML recipes and question bank (proposal 0001, decisions 0001–0004 in `docs/decisions/`)
- **Tests / required checks:** `pnpm check` locally before every push; CI job `check` in `.github/workflows/ci.yml` (typecheck, tests, validate, strict difficulty checks on changed questions, calibration, coverage, Workers build, capacity)
- **Deployment:** manual `deploy` workflow (workflow_dispatch on `main`) to https://cert-practice-engine.vitoria-nuno.workers.dev; see `docs/deploy.md`
- **Material paths:** `.github/**` `app/wrangler.jsonc` `tools/src/build.ts` `recipes/*/recipe.yaml` `recipes/_schema/**` `bank/_schema/**` `AGENTS.md` `GOVERNANCE.md` `PROJECT.md`
- **Control overrides:**
  - Branch and PR into `main`: required for every change, including trivial edits; stricter than Lightweight (Owner rule in `AGENTS.md` → Git and PRs, before 2026-10-17).
  - Required CI checks: the `check` job must be green before merge; stricter than Lightweight (`AGENTS.md`, "keep it green"). No GitHub ruleset enforces it yet.
- **Standing delegations:**
  - Claude merges a PR and runs the deploy workflow once its CI is green, then reports what shipped: "You don't need to ask me, just deploy." (Owner, 2026-10-13). Not covered: scheduling automation, recipe weight or domain changes without an official source, the free-plan rule.
  - Daily question batch (`docs/automation/daily-batch.md`): Claude's scheduled tasks add up to 30 checked questions per exam below its pool target each day (trial from 2026-10-19; AAIG paused until its outline exists), merge after Codex's scheduled review, and deploy; when every exam is at target they suggest a new security exam instead. "I would like you to schedule a daily task for this project" (Owner, 2026-10-18). Changing the schedule, batch size or targets needs the Owner.

Stage is one of PoC, Pilot or Production; profile is Lightweight, Standard or Strict (see `GOVERNANCE.md` → Profiles and controls). Keep the profile word first on its line: the approval check reads it. Material paths are backtick-quoted globs that always make a PR material. Control overrides are lasting changes to one control of the profile, for example: "Release approval: as in Strict (Owner, 2026-10-17, customer-facing launch)". An override does not change any check by itself; the same PR must make the matching CI or GitHub settings change (see `GOVERNANCE.md` → Profiles and controls). Temporary exemptions, such as no approvals for one feature, are review waivers (GitHub issues labelled `review-waiver`), not entries here.

Reassess the profile before the first production deployment. Changing this file does not configure GitHub rules, CI or Copilot; see `GOVERNANCE.md` → GitHub settings per profile.

**Production checkpoint for this project:** the site is public but free, with no accounts, payments or own domain. Treat roadmap phase 8 (accounts, payments, the domain; `docs/roadmap.md`) as the first production deployment: before it starts, propose a profile assessment to the Owner.

## Profile history

| Date | From → to | Stage | Reason | Approved by |
|---|---|---|---|---|
| 2026-10-17 | — → Lightweight | Pilot | Governance template retrofitted to an existing pilot; Lightweight matches the protections the repo has today | Owner: "We would use the lightweight version, at least for now." (chat, 2026-10-17) |

## Available AI and development tools

These are starting assumptions; confirm actual access, plan limits and project suitability before relying on them.

| Service | Plan / budget | Typical use |
| --- | --- | --- |
| ChatGPT / Codex | Plus (existing subscription) | Implementation, alternative approaches, independent review |
| Claude | Pro (existing subscription) | Coordination, implementation, content runs, independent review |
| GitHub Copilot | Pro (existing subscription) | Coding assistance and PR reviews |
| GitHub | Free tier; Copilot billed separately | Repository, pull requests, Actions / CI |
| Cloudflare | Free tier only (Owner rule) | Workers hosting, static assets, D1 (feedback, usage stats) |

**Cost policy:** Prefer existing subscriptions and free tiers. Do not introduce paid APIs, subscriptions, metered infrastructure or recurring costs without Owner approval. Verify current quotas and limits before choosing an architecture.

**Access policy:** A subscription does not imply API access, unrestricted usage or permission to act through a connector. Verify available tools, permissions and deployment capability. Prefer simple, maintainable, portable architectures; choose a different provider when requirements justify it.

## Shared infrastructure and known limits

GitHub and Cloudflare are shared by all projects. Plan for aggregate resource use, not an assumed independent quota per repository.

This project's limits, per-pilot budget and guardrails are in [`docs/platform-limits.md`](docs/platform-limits.md), the source of truth; CI checks them with `pnpm --filter @cpe/app run capacity`. This repository is public, so its Actions minutes are free; the 2,000-minute allowance applies to private repositories on the same account.

**Resource policy:** Prefer efficient CI triggers, caching, static delivery when suitable and proportionate background schedules. Avoid redundant builds, deployments, polling, storage and API calls. Preserve functionality, reliability, security and user experience. Check which limits are account-wide versus per-resource, and verify current usage before significant decisions. Escalate expected capacity pressure or paid upgrades to the Owner.
