# AGENTS.md

Rules for every coding agent working in this repo (Codex reads this file directly;
Claude Code reads it through `CLAUDE.md`). Keep this the single source of truth.

## What this repo is

A self-study platform for multiple-choice certification exams. One engine serves
many exams; each exam is defined by a **recipe**, and questions live in a
**bank**. Design: `docs/proposals/0001-repo-structure-and-app-architecture.md`. Roadmap (what is next, and what is deliberately last): `docs/roadmap.md`.

```
recipes/_format/   Recipe format definitions (current: v0.2)
recipes/_schema/   JSON Schema for recipes
recipes/<exam>/    recipe.yaml per exam
bank/_schema/      JSON Schema for questions
bank/<exam>/<domain>/<id>.yaml   one file per question
tools/             Content CLI (TypeScript): validate, coverage, build (public content)
docs/              Content rules, automation runbooks, decisions, proposals
app/               Next.js web app, deployed to Cloudflare Workers (docs/deploy.md)
```

## Commands

Node 22+, pnpm 10.

```
pnpm install
pnpm validate      # schema + cross-checks on recipes and the whole bank
pnpm coverage      # published/pending vs targets per subdomain (pnpm coverage -- cissp)
pnpm --filter @cpe/app dev       # run the site locally
pnpm --filter @cpe/app preview   # run it in the local Cloudflare Workers runtime
pnpm test          # tool and app tests
pnpm typecheck
pnpm check         # all of the above; run before every push
```

## Content rules (summary; full text in docs/content-rules.md)

- Every question is **original**. Never copy, paraphrase closely, or "reconstruct"
  official, leaked, brain-dump or vendor practice questions. Don't paste outline
  text beyond the short subdomain headings already in the recipe.
- Follow the recipe's `style` block: one best answer, plausible distractors,
  no "all/none of the above", judgment over trivia.
- Every option gets an explanation (`why_correct` and `why_not` for each wrong option).
- Tag each question with the recipe's current `outline_version`.
- The site and brand are independent of the issuers; exam names never appear in
  the brand, logo or domain.

## Question lifecycle

`draft` → `in_review` → `published` → (`retired`). Published requires
`provenance.check_verdict: pass` from an independent check. Never delete a
question file or reuse an ID; retire it instead. Editing a published question
means a PR whose description says what changed and why.

IDs: `<exam>-<domain>-<subdomain>-<4 digits>`, e.g. `cissp-d1-1.9-0042`. Take the
next free number in that subdomain.

## Git and PRs

- Branches: `content/<exam>/<run-id>`, `fix/<question-id>`, `feat/<topic>`, or the
  branch your session assigns.
- Everything reaches `main` through a PR the owner reviews. Content PRs follow
  `docs/automation/publishing.md`.
- CI (`.github/workflows/ci.yml`) runs `pnpm check` and the Cloudflare app build; keep it green.

## Never

- Never schedule or enable automation (cron, triggers, scheduled workflows)
  without the owner's explicit approval.
- Never commit secrets, API keys or learner data.
- Never edit a recipe's weights or domains except in a PR that cites the
  issuer's official outline.
- Never weaken or skip a validator rule or test to make CI pass.
- Never ship drafts or unchecked questions to the browser. Only `tools/src/build.ts`
  decides what public content the app bundles, via `PUBLIC_ACCESS`: `open` (all
  published questions, the owner's choice until monetisation, decision 0004) or
  `free-sample` (published sample questions only). Only the owner changes that
  setting. `app/test/content.test.ts` guards the bundle. Once paid unlocks exist,
  never ship paid questions to the browser.
