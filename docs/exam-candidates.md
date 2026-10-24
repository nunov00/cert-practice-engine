# Exam candidates

A ranked queue of the next 10 exams the platform could add, security-related
only for now (owner, 2026-10-18). The daily batch keeps it current
([`automation/daily-batch.md`](automation/daily-batch.md)) and Codex reviews the
changes with each daily PR. When every live exam reaches its pool target, the
top candidate is the one proposed to the owner. Adding an exam always waits for
the owner's decision.

## How candidates are ranked

Score 1 to 5 on each, then rank by the total (demand counts double):

- **Demand (x2):** how many people sit the exam and how often employers ask for
  it. Evidence: issuer-published holder or candidate counts, public job-posting
  data (CyberSeek, large job boards), government role requirements.
- **Fit:** multiple choice and domain-based with published weights, as the
  engine expects. Exams with performance-based or lab tasks score lower: the
  site can only practise their multiple-choice part.
- **Calibration:** official outline and public sample questions to calibrate on
  (`docs/calibration/standard.md`).
- **Willingness to pay:** paid exam, professional audience, few free official
  practice options.
- **Synergy:** shares ground with exams already live, so writers and checkers
  start from known material.

Only public sources count as evidence: issuer pages, official reports, public
job-posting statistics. Never braindump or exam-dump sites. Each row says when
it was last checked; facts marked *to verify* have not been checked against the
issuer yet.

## Queue

Last full review: 2026-10-18 (initial ranking, from general knowledge of the
market; every row is *to verify* until a daily run checks it).

| Rank | Exam (issuer) | Format | Demand | Fit | Calib. | Pay | Synergy | Total | Checked |
|---:|---|---|---:|---:|---:|---:|---:|---:|---|
| 1 | CISM (ISACA) | 150 MCQ, 4 domains (18/20/33/29% from 2026-11-03) | 5 | 5 | 5 | 5 | 5 | 30 | 2026-10-18 |
| 2 | CISA (ISACA) | 150 MCQ, 5 domains (18/18/12/26/26%) | 5 | 5 | 5 | 5 | 4 | 29 | 2026-10-19 |
| 3 | CRISC (ISACA) | 150 MCQ, 4 domains (26/22/32/20%) | 3 | 5 | 5 | 5 | 5 | 26 | 2026-10-24 |
| 4 | CCSP (ISC2) | 125-150 MCQ, 6 domains *to verify* | 4 | 5 | 3 | 5 | 4 | 25 | 2026-10-18 |
| 5 | Security+ (CompTIA) | up to 90, MCQ and performance-based *to verify* | 5 | 3 | 4 | 4 | 3 | 24 | 2026-10-18 |
| 6 | CC (ISC2) | 100 MCQ, 5 domains *to verify* | 4 | 5 | 4 | 1 | 4 | 22 | 2026-10-18 |
| 7 | CEH (EC-Council) | 125 MCQ *to verify* | 4 | 5 | 2 | 4 | 2 | 21 | 2026-10-18 |
| 8 | CySA+ (CompTIA) | up to 85, MCQ and performance-based *to verify* | 3 | 3 | 4 | 4 | 3 | 20 | 2026-10-18 |
| 9 | SSCP (ISC2) | 125 MCQ, 7 domains *to verify* | 2 | 5 | 3 | 4 | 4 | 20 | 2026-10-18 |
| 10 | CGRC (ISC2) | 125 MCQ, 7 domains *to verify* | 2 | 5 | 3 | 4 | 4 | 20 | 2026-10-18 |

Rank follows the total; ties go to the higher demand score, then to the
older Checked date.

## Notes per candidate

- **CISM:** ISACA's management-level security exam; closest to AAISM and AAIR,
  so the writer notes and calibration method carry over. ISACA publishes a free
  practice quiz for calibration. Checked 2026-10-18: a new outline takes effect
  on 2026-11-03 with the same four domains reweighted to 18/20/33/29% and new
  enterprise and security architecture content; over 111,000 holders since 2002.
  A recipe should be built on the new outline.
- **CISA:** ISACA's audit exam; overlaps AAIR on risk and controls. Checked
  2026-10-19: 150 questions over five domains weighted 18/18/12/26/26%, on the
  outline in force since 2024-08-01; more than 207,000 holders since 1978, the
  largest ISACA audience, so demand moves from 4 to 5. ISACA publishes a free
  10-question practice quiz for calibration.
- **CRISC:** ISACA's IT risk exam; smaller audience but strong overlap with AAIR.
  Checked 2026-10-24: 150 questions over four domains (Governance 26%, Risk
  Assessment 22%, Risk Response and Reporting 32%, Technology and Security
  20%), on the outline in force since 2025-11-03, which reweighted two domains
  and kept the same four; more than 45,000 holders since inception, so demand
  stays at 3. ISACA publishes a free practice quiz for calibration.
- **CCSP:** ISC2's cloud security exam, often taken after CISSP; shares
  CISSP's style.
- **Security+:** the most widely held entry security certification and a US
  DoD 8140 baseline, so its demand is the highest on the list. It ranks lower
  because its performance-based items cannot be practised here; a product note
  would have to say so.
- **CC:** very large candidate pool from ISC2's free-exam programmes, so
  learners are less likely to pay.
- **CEH:** high name recognition in job postings; EC-Council publishes fewer
  official samples, so calibration is weaker.
- **CySA+, SSCP, CGRC:** solid but smaller markets; kept as the tail of the
  queue.

## Changes

| Date | Change | Why |
|---|---|---|
| 2026-10-18 | Queue created | Owner asked for a ranked queue of 10 candidates |
| 2026-10-18 | CISM row verified: format and weights confirmed, *to verify* dropped; scores and rank unchanged | ISACA [exam content outline](https://www.isaca.org/credentialing/cism/cism-exam-content-outline), [2026 outline press release](https://www.isaca.org/about-us/newsroom/press-releases/2026/isaca-updates-cism-exam-content-outline-factoring-in-todays-technologies-security-responsibilities), [practice quiz](https://www.isaca.org/credentialing/cism/cism-practice-quiz) |
| 2026-10-19 | CISA row verified: format and weights confirmed, *to verify* dropped; demand 4 to 5 (total 27 to 29), rank unchanged | ISACA [exam content outline](https://www.isaca.org/credentialing/cisa/cisa-exam-content-outline), [2024 outline press release](https://www.isaca.org/about-us/newsroom/press-releases/2024/isacas-cisa-exam-updated-to-reflect-innovations-and-evolving-technologies-impacting-it-audit), [practice quiz](https://www.isaca.org/credentialing/cisa/cisa-practice-quiz) |
| 2026-10-24 | CRISC row verified: format and weights confirmed, *to verify* dropped; scores, total and rank unchanged | ISACA [exam content outline](https://www.isaca.org/credentialing/crisc/crisc-exam-content-outline), [2025 outline press release](https://www.isaca.org/about-us/newsroom/press-releases/2025/isaca-updates-cdpse-and-crisc-exams-to-reflect-latest-risk-and-privacy-priorities), [practice quiz](https://www.isaca.org/credentialing/crisc/crisc-practice-quiz) |
