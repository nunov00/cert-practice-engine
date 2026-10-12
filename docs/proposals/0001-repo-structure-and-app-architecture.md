# Proposal 0001: Repo structure and app architecture

Status: **Approved by the owner on 2026-10-12** with all recommended defaults (D1–D4) and the v0.2 recipe additions in §3.1. D5 (brand name) is open until launch.
Covers next steps 1 (repo structure) and 3 (app architecture, accounts, payments).
Step 2 (AAIR recipe) waits on confirmed domain weights.

> **Recipe format.** This proposal follows the owner's recipe format v0.1, checked in at
> `recipes/_format/recipe-format.v0.1.yaml`. Section 3.1 lists a few suggested additions for v0.2.

---

## 1. Decisions this proposal needs from the owner

Everything else below is a default that can be changed later at low cost. These five
are the ones that are expensive to reverse or that only the owner can make.

| # | Decision | Recommendation |
|---|----------|----------------|
| D1 | Payment provider: merchant of record (Paddle) or plain Stripe | **Paddle** (handles VAT/GST worldwide, refunds, invoices; ~5% + 0.50 per sale) |
| D2 | Stack: Next.js + Supabase on Vercel | **Yes** (one TypeScript toolchain, managed auth + Postgres, EU region) |
| D3 | Free sample without an account | **Yes**, progress kept in the browser; account required only at purchase |
| D4 | CISSP mock format (real exam is adaptive 100–150) | **Fixed 150 questions / 3 h** for v1, adaptive mode later once difficulty is calibrated; set via the proposed `product.mock` (§3.1) |
| D5 | Brand name and domain (must not contain exam names) | Owner to choose; not blocking until launch |

Details and alternatives are in the sections referenced below (D1 → §6.4, D2 → §6.1,
D3 → §6.3, D4 → §6.5).

---

## 2. Repo structure (step 1)

One private monorepo. Content and code live together so one pull request can carry a
batch of questions and the validator that checks them, and so Codex and Claude both
see the same rules.

```
cert-practice-engine/
├── AGENTS.md                  # Canonical agent rules (Codex reads this natively)
├── CLAUDE.md                  # One line: @AGENTS.md  (Claude Code imports it)
├── README.md
├── recipes/
│   ├── _format/recipe-format.v0.1.yaml   # Owner's format definition
│   ├── _schema/recipe.schema.json         # Machine-checkable version of it
│   ├── cissp/
│   │   └── recipe.yaml        # Format, domains, weights, style, bank, product
│   └── aair/
│       └── recipe.yaml        # Added in step 2
├── bank/
│   ├── _schema/question.schema.json
│   ├── cissp/
│   │   ├── d1/                # One folder per domain
│   │   │   └── cissp-d1-1.1-0001.yaml
│   │   └── ...
│   └── aair/
├── tools/                     # Content CLI: validate, dedupe, coverage, build
├── app/                       # Next.js web app (learner site + API routes)
├── db/
│   └── migrations/            # SQL migrations for Supabase Postgres
├── docs/
│   ├── content-rules.md       # Originality, style, non-affiliation, sourcing
│   ├── automation/
│   │   ├── generation.md      # How a generation run works (prompt, inputs, outputs)
│   │   ├── quality-check.md   # Independent second-pass checker
│   │   ├── publishing.md      # PR format, spot-check guidance, merge → deploy
│   │   └── weekly-steering.md # What the owner sees and decides each week
│   ├── decisions/             # Short ADRs, one per lasting decision
│   └── proposals/             # Documents like this one
└── .github/
    ├── pull_request_template.md
    └── workflows/
        ├── content.yml        # Schema + dedupe + coverage on bank/recipe changes
        └── app.yml            # Typecheck, lint, tests on app/tools changes
```

### 2.1 Why one file per question

- Generation PRs from parallel runs never conflict with each other.
- A PR diff shows exactly the questions added or changed, which is what a spot-check needs.
- Git history gives each question an audit trail (who generated, who fixed, when retired).
- At a few thousand questions per exam this stays fast; the build step compiles them into one artifact.

### 2.2 AGENTS.md and CLAUDE.md

`AGENTS.md` is the single rulebook: repo map, commands (`pnpm validate`, `pnpm test`),
content rules summary, branch and PR conventions, "never" list (no copying source
material, no editing `published` questions in place without a revision note, no
scheduling automation without owner approval). `CLAUDE.md` contains only `@AGENTS.md`
so the two agents can never drift. Tool-specific extras, if ever needed, go below that
import line.

### 2.3 Conventions

- **Branches:** `content/<exam>/<run-id>` for generation runs, `fix/<question-id>` for
  flagged-question fixes, `feat/...` for app work.
- **Question IDs:** `<exam>-<domain>-<subdomain>-<4 digits>` as in v0.1
  (e.g. `cissp-d1-1.1-0042`), assigned by the CLI, never reused.
  Retired questions keep their file with `status: retired`.
- **Outline versions:** each question carries `outline_version`, the outline's
  effective date as in the recipe (e.g. `"2024-04-15"`).
  When an issuer publishes a new outline, a new recipe version is added and the
  coverage report shows which questions still need re-checking against it.
- **Language:** TypeScript for both `tools/` and `app/`, sharing one set of Zod schemas
  generated from the JSON Schemas, so the validator and the app agree on the format.

---

## 3. Recipe format

The owner's draft **v0.1** is checked in verbatim at
[`recipes/_format/recipe-format.v0.1.yaml`](../../recipes/_format/recipe-format.v0.1.yaml)
and is the source of truth. Everything in this proposal reads from it:

| v0.1 block | What the engine uses it for |
|------------|-----------------------------|
| `exam` (`id`, `name`, `issuer`, `disclaimer`, `outline.source_url/version/last_checked`) | Exam pages, the per-exam non-affiliation line, tagging every question with `outline.version`, and the outline-change watch (§5.1) |
| `format` (`delivery`, `questions`, `duration_minutes`, `scoring`, `question_types`) | Mock exam shape (§6.5); scoring is shown for information only |
| `style` (`voice`, `options_per_question`, `rules`) | Generator prompt and checker rubric; `options_per_question` is also enforced by the validator |
| `domains` (`id`, `name`, `weight` as a fraction, `subdomains` with `target_questions`) | Mock blueprints, readiness weighting, coverage gaps that drive generation |
| `bank` (`target_total`, `difficulty_mix`, `review.*`) | Coverage report, generation planning, auto-flag thresholds (§6.6) |
| `product` (`free_sample_per_domain`, `unlock.price_chf/access_days`, `readiness.*`) | Free sample, checkout price and access length, the "looks ready" rule (§6.5) |

Mock blueprints are derived from `weight` with largest-remainder rounding (CISSP at 150:
24 / 15 / 20 / 20 / 19 / 18 / 19 / 15), so changing a weight in the recipe is the only
change needed when an outline updates.

### 3.1 Proposed additions for v0.2 (small, all optional)

These are gaps the engine would hit; each is a suggestion for the owner to accept or drop.

1. **`product.mock`**: `{ questions, minutes, forms }`. `format` describes the real exam,
   but for an adaptive exam the engine still needs one concrete mock length (see D4).
   For linear exams like AAIR it can default to `format`.
2. **Question `provenance`**: `{ generated_by, run_id, checked_by, check_verdict }` on each
   question, so the PR summary and later audits can tell which run produced what.
3. **Question `sample: true`**: marks the questions in the free sample, so the sample is
   stable and hand-pickable rather than "first 10 per domain".
4. **Validation rules** written down: domain weights sum to 1.0, subdomain targets sum
   to roughly `bank.target_total`, `difficulty_mix` sums to 1.0. The validator enforces them.
5. **Subdomain titles** use the outline's short headings as labels only; no longer outline
   text is copied into the repo (keeps with the originality rule).

---

## 4. Question format

As in v0.1, one file per question, plus the two proposed fields from §3.1:

```yaml
id: cissp-d1-1.1-0042          # <exam>-<domain>-<subdomain>-<4 digits>
subdomain: "1.1"
difficulty: medium             # easy | medium | hard
stem: "..."
options: { A: "...", B: "...", C: "...", D: "..." }
answer: B
explanation:
  why_correct: "..."
  why_not: { A: "...", C: "...", D: "..." }
status: published              # draft | in_review | published | retired
outline_version: "2024-04-15"
sample: false                  # proposed (§3.1)
provenance:                    # proposed (§3.1)
  generated_by: claude         # claude | codex | human
  run_id: 2026-10-20-cissp-d1-a
  checked_by: 2026-10-20-cissp-d1-a-check
  check_verdict: pass
```

Exam and domain come from the ID and the folder, so they are not repeated in the file;
the validator checks that the ID, folder and `subdomain` agree with the recipe.

No question ever quotes or references official, leaked or vendor practice material.
`docs/content-rules.md` states this and the checker enforces it as best it can (see §5).

---

## 5. Content pipeline (documented now, scheduled only after approval)

```
recipe + coverage gaps
        │
        ▼
 1. Generate      one run = one exam, one domain, N questions (e.g. 20) on a branch
        │
        ▼
 2. Check         separate session, no access to the generator's reasoning:
                  answers each question blind, then compares with the key;
                  flags ambiguity, multiple defensible answers, out-of-scope topics,
                  style-rule breaks, factual errors in explanations
        │
        ▼
 3. Dedupe        exact + near-duplicate check against the whole bank
                  (normalised text similarity first; embeddings later if needed)
        │
        ▼
 4. Validate      CI: schema, option count, answer key present, explanation for
                  every option, domain exists in recipe, outline_version matches
        │
        ▼
 5. Pull request  summary table (counts per domain/difficulty, checker verdicts,
                  rejects with reasons) + a suggested random sample to spot-check
        │
        ▼
 6. Owner merges  merge to main triggers deploy; build compiles bank → database
```

Questions the checker rejects never enter the PR; they go into the PR summary with the
reason, so the owner can see the reject rate per run. A rising reject rate is a signal
to adjust the recipe's style rules or the generation prompt.

### 5.1 Outline-change watch

v0.1 has `exam.outline.last_checked`, updated by a scheduled task. Proposed behaviour:
the task fetches `source_url`, compares it with the last snapshot, and if anything
changed opens an issue (or PR updating `last_checked` only) describing the difference.
It never edits weights or domains itself; the owner does that in a recipe PR. Like all
automation, this is documented now and scheduled only after approval.

### 5.2 Independence

The generator and checker should be different runs with different instructions, and
ideally alternate models (e.g. Claude generates, Codex checks, or vice versa), so the
second pass is genuinely independent.

---

## 6. App architecture (step 3)

### 6.1 Stack (D2)

| Layer | Choice | Why |
|-------|--------|-----|
| Web app | **Next.js (App Router, TypeScript)** | Server rendering for marketing pages and SEO, API routes for the small backend, one language with `tools/` |
| Database + auth | **Supabase** (Postgres, Auth, Row Level Security), EU region | Managed, generous free tier, row-level security keeps per-user data private without custom auth code; EU hosting suits GDPR and the Swiss nFADP |
| Hosting | **Vercel** (Pro plan, ~USD 20/month; the free plan disallows commercial use) | Zero-ops deploys from `main`, preview deploys on every PR |
| Payments | **Paddle** (see D1, §6.4) | Merchant of record |
| Email | Supabase built-in for magic links at first; Resend or Postmark later if volume needs it | |

Running cost at launch: roughly USD 20–45/month (Vercel Pro, Supabase free → Pro at
USD 25 when needed, domain). Two sales a month covers it.

Cheaper alternative if preferred: Cloudflare Pages/Workers + D1 (near-zero cost) at
the price of more setup and a less standard Next.js runtime.

### 6.2 How content reaches the app

The question bank is **not** shipped as static files, because paid questions and
answer keys would then be downloadable by anyone.

1. On merge to `main`, a build step runs `tools build`, which validates and compiles
   `bank/` + `recipes/` into rows.
2. A deploy job upserts those rows into Postgres (`questions` keyed by `id`, with a
   content hash so only changed questions are written).
3. The app serves questions through API routes that check entitlement first.
4. Answers and explanations are returned only after the learner submits an answer
   (drill) or the exam (mock).

### 6.3 Accounts (D3)

- **Free sample without sign-up.** Anyone can drill the free questions
  (`product.free_sample_per_domain` from the recipe, 10 for CISSP). Progress lives in browser storage.
- **Sign-up at purchase**, or earlier if the learner wants progress synced. Email
  magic link plus Google sign-in, both via Supabase Auth. No passwords to store.
- On first sign-in, browser progress is merged into the account.
- Account deletion and data export are self-serve from settings (GDPR / nFADP).

### 6.4 Payments and entitlements (D1)

**Recommended: Paddle as merchant of record.** Paddle is the legal seller, so it
collects and remits VAT/GST in every country, issues invoices, and handles refunds and
chargebacks. For a solo-run business selling to individuals worldwide this removes the
EU VAT registration (required from the first euro for digital services sold to EU
consumers by a non-EU seller) and similar obligations elsewhere. Cost is about 5% +
0.50 per transaction.

**Alternative: Stripe.** Lower fees (~2.9% + 0.30, plus Stripe Tax ~0.5%), supports
TWINT for Swiss buyers, but the business is the seller and must register and file VAT
where required. Worth it only if sales are mostly Swiss or volume is high.

Either way the app talks to the provider through one small interface
(`createCheckout`, `handleWebhook`), so switching later touches one module.

Flow:

```
Learner clicks "Unlock CISSP"
  → signed in? if not, magic link first
  → server creates checkout with {user_id, exam_id} in metadata
  → provider-hosted checkout (card, Apple/Google Pay, PayPal)
  → provider webhook → verify signature → idempotent insert into entitlements
  → learner returns to the app, unlock is live
```

`entitlements(user_id, exam_id, starts_at, expires_at, source, payment_ref)`.
Buying again while active extends `expires_at` by `access_days`. A refund webhook sets
`expires_at` to now. Access checks are a single indexed lookup.

### 6.5 Learner features

| Feature | Approach |
|---------|----------|
| **Domain drills** | Pick a domain (or subtopic), get unanswered and due-for-review questions first; immediate feedback with explanation per option |
| **Mock exams** (D4) | Fixed forms built from the recipe blueprint, real time limit, no feedback until the end, results by domain. CISSP v1: 150 questions / 180 min, linear, labelled as "CAT-length practice", not a simulation of adaptive scoring. AAIR: 90 / 150 min |
| **Weak-spot review** | Queue of missed questions with spaced repetition (1, 3, 7, 14 days), plus extra drills from the lowest-readiness subtopics |
| **Readiness score** | Per domain: recency-weighted accuracy, shrunk toward 50% when there are few attempts (so 3/3 correct doesn't read as "ready"). The "looks ready" message follows `product.readiness` in the recipe: at least `min_answered` (CISSP: 600) questions answered **and** every domain at or above `min_accuracy_per_domain` (75%). Below that, bands show progress (Not yet / Getting there). Never shown as a predicted official score or pass guarantee |
| **Report question** | Button on every question: wrong key, ambiguous, typo, out of scope, other + free text |

### 6.6 Auto-flagging suspect questions

Computed nightly from attempts, using the thresholds in the recipe's `bank.review`:

- **Report rate** above `retire_if_report_rate_above` (CISSP: 5% of the learners who
  saw it), counted only once at least 20 learners have seen the question, or
- **Common wrong answer**: one distractor chosen by more than
  `flag_if_common_wrong_answer_above` (50%) of answers, a likely bad key, after at
  least 30 answers.

A question that crosses a threshold is hidden from mocks and drills immediately (a status
overlay in the database, no deploy needed) and listed in the weekly steering digest.
Retiring or fixing it happens in the repo via a `fix/<id>` PR, so `status: retired`
in the bank is always a human-approved change; on merge the overlay is cleared.
The minimum-sample counts (20, 30) are proposed engine defaults; they could move into
`bank.review` in v0.2 if the owner wants them per exam.

### 6.7 Data model (Postgres)

| Table | Purpose |
|-------|---------|
| `exams` | Synced from recipes |
| `questions` | Synced from bank; `status`, `difficulty`, `sample`, `content_hash`, `outline_version` |
| `question_overrides` | Runtime flag overlay (auto-flag, manual hide) |
| `entitlements` | Who can access which exam until when |
| `payment_events` | Raw webhook log, idempotency key |
| `sessions` | A drill or mock run: mode, exam, blueprint, started/finished |
| `attempts` | user, question, session, chosen option, correct, time spent |
| `reports` | Learner reports on questions |
| `review_queue` | Spaced-repetition schedule per user/question |

Row Level Security: learners read and write only their own `sessions`, `attempts`,
`reports`, `review_queue`; `questions` are never readable directly, only through
server routes that check entitlement.

### 6.8 Legal and trust pages

- Every exam page shows that recipe's `exam.disclaimer`; the site footer carries a
  general line ("Not affiliated with, endorsed by, or sponsored by ISC2 or ISACA.
  CISSP is a registered mark of ISC2. AAIR is a mark of ISACA."). Exam names
  appear only descriptively (on exam pages), never in the brand, logo or domain.
- Terms, privacy policy, refund policy. With Paddle, Paddle's buyer terms cover the
  sale; the site's own terms cover access and acceptable use.
- A short "How our questions are made" page: original, generated and independently
  checked, reviewed by a human, with a report button. This builds trust and supports
  the originality rule.

---

## 7. Weekly owner steering (what gets automated, once approved)

One digest per week (as a PR comment, issue or project message, owner's choice):

- Sales and active learners per exam
- New auto-flags and open reports, with links to proposed fixes
- Coverage vs bank targets per domain, and the next generation runs planned
- Checker reject rate per run

Owner actions: merge or reject content PRs, approve fixes, add a new exam recipe,
change price or free sample size in the recipe.

---

## 8. Suggested build order (each phase starts only on owner approval)

1. **Skeleton:** `AGENTS.md`, `CLAUDE.md`, folders, JSON Schema for the recipe and
   question formats, `tools validate`, content CI, PR template, `docs/content-rules.md`,
   and the CISSP recipe filled in from v0.1 (subdomains from the official outline).
2. **First content:** one manual generation + check run per CISSP domain to tune the
   prompts and the PR format before anything is scheduled.
3. **App MVP:** free drills from the sample, no accounts yet.
4. **Accounts + payments:** Supabase Auth, provider checkout, entitlements, paid drills.
5. **Mocks, weak-spot review, readiness, report button, auto-flagging.**
6. **Automation:** schedule generation/check runs and the weekly digest.
7. **AAIR:** recipe (after weights are confirmed) and its content runs.

Launch is possible after phase 5 with CISSP only.
