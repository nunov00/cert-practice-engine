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
| 4 | CCSP (ISC2) | 100-150 CAT items (MCQ and advanced types), 6 domains (17/20/17/16/17/13%) | 4 | 5 | 3 | 5 | 4 | 25 | 2026-10-24 |
| 5 | Security+ (CompTIA) | up to 90, MCQ and performance-based, 5 domains (27/24/19/16/14% on V8 from 2026-11-17) | 5 | 3 | 3 | 4 | 3 | 23 | 2026-10-26 |
| 6 | CC (ISC2) | Adaptive (CAT), 5 domains (outline from 2026-09-01; weights to confirm from the outline) | 4 | 5 | 4 | 2 | 4 | 23 | 2026-10-27 |
| 7 | CEH (EC-Council) | 125 MCQ in 4 hours, v13; official blueprint v5 lists 9 domains (6/17/15/24/14/5/10/5/5%), applicability to v13 to confirm | 4 | 5 | 2 | 4 | 2 | 21 | 2026-10-28 |
| 8 | CySA+ (CompTIA) | up to 85 in 165 min, MCQ and performance-based, 4 domains (34/26/24/16% on V4 from 2026-06-23) | 3 | 3 | 4 | 4 | 3 | 20 | 2026-10-29 |
| 9 | SSCP (ISC2) | 100-125 CAT items (MCQ and advanced types) in 2 hours, 7 domains (16/15/15/14/9/16/15%) | 2 | 5 | 3 | 4 | 4 | 20 | 2026-10-31 |
| 10 | CGRC (ISC2) | 125 items (MCQ and advanced types) in 3 hours, 7 domains (16/10/14/17/16/14/13%) | 2 | 5 | 3 | 4 | 4 | 20 | 2026-11-01 |

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
  CISSP's style. Checked 2026-10-24: adaptive (CAT) since 2025-10-01, 100 to
  150 items in 3 hours, pass mark 700/1000; outline in force since 2026-08-01
  keeps six domains weighted 17/20/17/16/17/13%. Like CISSP it mixes multiple
  choice with some advanced item types, so fit stays at 5. ISC2 offers an
  official [10-question CCSP quiz](https://cloud.connect.isc2.org/ccsp-quiz)
  in its [knowledge-check directory](https://www.isc2.org/certifications/quizzes),
  but its items could not be read through a page fetch, so calibration stays at
  3 provisionally until the quiz's structure is assessed. ISC2's
  [outline refresh notice](https://www.isc2.org/Insights/2026/06/isc2-ccsp-exam-outline-revised)
  also gives public evidence of demand for cloud security skills. Scores and
  rank unchanged.
- **Security+:** the most widely held entry security certification and a US
  DoD 8140 baseline, so its demand is the highest on the list. It ranks lower
  because its performance-based items cannot be practised here; a product note
  would have to say so. Checked 2026-10-26: up to 90 multiple-choice and
  performance-based items in 90 minutes, pass mark 750/900. V8 (SY0-801)
  launches around 2026-11-17 with five domains weighted 27/24/19/16/14%;
  V7 (SY0-701, 28/22/20/18/12%) retires in English on 2027-06-11. A recipe
  should be built on V8. CompTIA's exam pages list no free official sample
  questions, only paid practice products, so calibration moves from 4 to 3
  (total 24 to 23); rank unchanged.
- **CC:** very large candidate pool from ISC2's free-exam programmes, so
  learners are less likely to pay. Checked 2026-10-27: ISC2 delivers CC as an
  adaptive (CAT) exam, and a refreshed outline took effect on 2026-09-01 with
  five domains (Security Principles, Security Governance, IAM Concepts,
  Networking and Cloud Security Concepts, Security Operations and Incident
  Response); the outline page text we fetched shows no domain weights, while
  Codex's review reads 24 / 17.3 / 20 / 21.3 / 17.3 percent on it, so a recipe
  would need them confirmed from the official outline first. Item count and
  item types (multiple choice plus any advanced items) also need confirming. ISC2 links an official CC practice quiz for
  calibration. ISC2 announced in April 2026 that its One Million Certified in
  Cybersecurity free course-and-exam programme is concluding, so more
  candidates will pay for the exam: willingness to pay moves from 1 to 2
  (total 22 to 23). It ties Security+ on 23 and stays below it on demand, so
  the rank is unchanged.
- **CEH:** high name recognition in job postings; EC-Council publishes fewer
  official samples, so calibration is weaker. Checked 2026-10-28: the current
  version is CEH v13 ("CEH AI"); the knowledge exam is 125 multiple-choice
  questions in 4 hours, with a pass mark set per form between 60% and 85%. An
  optional 6-hour practical (20 challenges) leads to CEH Master and is not
  needed for CEH itself, so fit stays at 5. The issuer's page lists the exam's
  topic areas but no domain weights. EC-Council does publish an
  [official exam blueprint v5](https://cert.eccouncil.org/wp-content/uploads/2024/04/CEH-Exam-Blueprint-v5.pdf)
  (April 2024) with nine domains weighted 6/17/15/24/14/5/10/5/5%; whether it
  is the blueprint for v13 still needs confirming before a recipe uses it. The
  issuer also offers a free
  [50-question CEH assessment](https://www.eccouncil.org/train-certify/ceh-assessment/),
  but only after submitting name, email and phone, so its items cannot be
  inspected without handing over personal data; calibration stays at 2 for
  that access limit, not for an absence of samples. It cites over 22,000 LinkedIn job listings (September 2024) and mapping
  to 45+ job roles, so demand stays at 4. Scores, total and rank unchanged.
- **CySA+:** CompTIA's analyst-level exam. Checked 2026-10-29: V4 (CS0-004)
  launched on 2026-06-23 with up to 85 multiple-choice and performance-based
  items in 165 minutes, pass mark 750/900, over four domains (Security
  Operations 34%, Vulnerability Management 26%, Incident Response and
  Management 24%, Reporting and Communication 16%); V3 (CS0-003,
  33/30/20/17%) retires in English on 2026-12-22, so a recipe should be built
  on V4. Its performance-based items (SIEM alerts, logs, indicators of
  compromise) cannot be practised here, so fit stays at 3. CompTIA publishes a
  free official set of 10 V4 practice questions with answers on its
  practice-questions page, so calibration stays at 4 (merge run, after Codex's
  review). Scores, total (20) and rank (8th, ahead of SSCP and CGRC on the
  higher demand score) unchanged.
- **CGRC:** solid but smaller market; kept as the tail of the queue. Checked
  2026-11-01: 125 items in 3 hours, multiple choice and advanced item types,
  pass mark 700/1000, on the outline in force since 2024-06-15 with seven
  domains (Security and Privacy Governance, Risk Management, and Compliance
  Program 16%, Scope of the System 10%, Selection and Approval of Framework,
  Security, and Privacy Controls 14%, Implementation of Security and Privacy
  Controls 17%, Assessment/Audit of Security and Privacy Controls 16%, System
  Compliance 14%, Compliance Maintenance 13%). The outline does not say whether
  delivery is adaptive or linear. The CGRC page lists U.S. DoDM 8140.03 approval
  and links an official
  [CGRC knowledge check](https://cloud.connect.isc2.org/cgrc-quiz), which, like
  the CCSP and SSCP quizzes, was not read through a page fetch, so calibration
  stays at 3. ISC2 publishes no CGRC holder count, so demand stays at 2. Scores
  and total (20) unchanged; it ranks 10th, below SSCP, which ties on total and
  demand and now has the older Checked date.
- **SSCP:** ISC2's practitioner-level operations exam; shares ground with
  CISSP and CCSP. Checked 2026-10-31: adaptive (CAT) since 2025-10-01, 100 to
  125 items in 2 hours, multiple choice and advanced item types, pass mark
  700/1000. The outline in force since 2025-10-01 has seven domains (Security
  Concepts and Practices 16%, Access Controls 15%, Risk Identification,
  Monitoring and Analysis 15%, Incident Response and Recovery 14%,
  Cryptography 9%, Network and Communications Security 16%, Systems and
  Application Security 15%). Like CCSP it mixes multiple choice with some
  advanced item types, so fit stays at 5. ISC2 lists an official
  [SSCP quiz](https://cloud.connect.isc2.org/sscp-quiz) in its
  [knowledge-check directory](https://www.isc2.org/certifications/quizzes),
  but its items could not be read through a page fetch, so calibration stays
  at 3, as for CCSP. The SSCP page says it meets DoDM 8140.03 and, paired with
  Security+, gives full DoD 8140 operational qualification; ISC2 publishes no
  SSCP holder count (its member counts page gives only the total of more than
  270,000), so demand stays at 2. Scores and total (20) unchanged; it ranked
  10th until CGRC was checked on 2026-11-01; it is now 9th.

## Changes

| Date | Change | Why |
|---|---|---|
| 2026-10-18 | Queue created | Owner asked for a ranked queue of 10 candidates |
| 2026-10-18 | CISM row verified: format and weights confirmed, *to verify* dropped; scores and rank unchanged | ISACA [exam content outline](https://www.isaca.org/credentialing/cism/cism-exam-content-outline), [2026 outline press release](https://www.isaca.org/about-us/newsroom/press-releases/2026/isaca-updates-cism-exam-content-outline-factoring-in-todays-technologies-security-responsibilities), [practice quiz](https://www.isaca.org/credentialing/cism/cism-practice-quiz) |
| 2026-10-19 | CISA row verified: format and weights confirmed, *to verify* dropped; demand 4 to 5 (total 27 to 29), rank unchanged | ISACA [exam content outline](https://www.isaca.org/credentialing/cisa/cisa-exam-content-outline), [2024 outline press release](https://www.isaca.org/about-us/newsroom/press-releases/2024/isacas-cisa-exam-updated-to-reflect-innovations-and-evolving-technologies-impacting-it-audit), [practice quiz](https://www.isaca.org/credentialing/cisa/cisa-practice-quiz) |
| 2026-10-24 | CRISC row verified: format and weights confirmed, *to verify* dropped; scores, total and rank unchanged | ISACA [exam content outline](https://www.isaca.org/credentialing/crisc/crisc-exam-content-outline), [2025 outline press release](https://www.isaca.org/about-us/newsroom/press-releases/2025/isaca-updates-cdpse-and-crisc-exams-to-reflect-latest-risk-and-privacy-priorities), [practice quiz](https://www.isaca.org/credentialing/crisc/crisc-practice-quiz) |
| 2026-10-24 | CCSP row verified: format (CAT, 100-150 items) and weights confirmed, *to verify* dropped; scores, total and rank unchanged | ISC2 [exam outline (effective 2026-08-01)](https://edge.sitecorecloud.io/internationf173-xmc4e73-prodbc0f-9660/media/Project/ISC2/Main/Media/documents/exam-outlines/EXAMS-CCSP-Exam-Outline-English-01-2026-V2.pdf), [CCSP exam page](https://www.isc2.org/certifications/ccsp/ccsp-exam), [outline refresh notice](https://www.isc2.org/Insights/2026/06/isc2-ccsp-exam-outline-revised), [CAT notice](https://www.isc2.org/Insights/2025/07/ccsp-exam-going-cat), [CCSP quiz](https://cloud.connect.isc2.org/ccsp-quiz) |
| 2026-10-26 | Security+ row verified: format, V8 weights and launch date confirmed, *to verify* dropped; calibration 4 to 3 (no free official samples found; total 24 to 23), rank unchanged | CompTIA [Security+ V7 page](https://www.comptia.org/en-us/certifications/security/v7/), [Security+ V8 page](https://www.comptia.org/en-us/certifications/security/v8/) |
| 2026-10-27 | CC row verified: CAT format and the 2026-09-01 outline's five domains confirmed, *to verify* dropped; pay 1 to 2 as the free programme concludes (total 22 to 23), rank unchanged | ISC2 [CC exam outline](https://www.isc2.org/certifications/cc/cc-certification-exam-outline), [CC page and practice quiz](https://www.isc2.org/certifications/cc), [CAT page](https://www.isc2.org/certifications/computerized-adaptive-testing), [One Million Certified in Cybersecurity conclusion](https://www.isc2.org/Insights/2026/04/one-million-certified-cyber-conclusion) |
| 2026-10-28 | CEH row verified: v13 format (125 MCQ, 4 hours, 60-85% pass mark) confirmed, *to verify* dropped; no official domain weights or free samples found; scores, total and rank unchanged | EC-Council [CEH page](https://www.eccouncil.org/train-certify/certified-ethical-hacker-ceh/) |
| 2026-10-28 | Merge run (Codex review): CEH row corrected to cite the official blueprint v5 weights and the form-gated 50-question assessment; scores unchanged | EC-Council [blueprint v5](https://cert.eccouncil.org/wp-content/uploads/2024/04/CEH-Exam-Blueprint-v5.pdf), [CEH assessment](https://www.eccouncil.org/train-certify/ceh-assessment/) |
| 2026-10-29 | CySA+ row verified: V4 format, weights and launch date confirmed, *to verify* dropped; free official V4 practice questions found, so calibration stays at 4; scores, total and rank unchanged | CompTIA [CySA+ V4 practice questions](https://www.comptia.org/en-us/certifications/cybersecurity-analyst/v4/practice-questions/), [CySA+ V4 page](https://www.comptia.org/en-us/certifications/cybersecurity-analyst/v4/), [CySA+ V3 page](https://www.comptia.org/en-us/certifications/cybersecurity-analyst/v3/), [CySA+ V4 FAQ](https://www.comptia.org/en-eu/blog/the-new-comptia-cybersecurity-analyst-cysa-your-questions-answered/) |
| 2026-10-31 | SSCP row verified: CAT format (100-125 items, 2 hours, MCQ and advanced types), seven domains and weights of the 2025-10-01 outline confirmed, *to verify* dropped; official quiz found but not readable, so calibration stays at 3; no SSCP holder count published, so demand stays at 2; scores and total unchanged, rank 9 to 10 (CGRC has the older Checked date) | ISC2 [exam outline (effective 2025-10-01)](https://edge.sitecorecloud.io/internationf173-xmc4e73-prodbc0f-9660/media/Project/ISC2/Main/Media/documents/exam-outlines/MAR-EXAMS-SSCP-Exam_Outline-English---10012025---FINAL.pdf), [outline page](https://www.isc2.org/certifications/sscp/sscp-certification-exam-outline), [SSCP page](https://www.isc2.org/certifications/sscp), [CAT notice](https://www.isc2.org/Insights/2025/05/computerized-adaptive-testing-examination-format-updates), [SSCP quiz](https://cloud.connect.isc2.org/sscp-quiz), [member counts](https://www.isc2.org/About/Member-Counts) |
| 2026-11-01 | CGRC row verified: format (125 items, 3 hours, MCQ and advanced types, 700/1000) and the 2024-06-15 outline's seven domains and weights confirmed, *to verify* dropped; official knowledge check found but not readable, so calibration stays at 3; no holder count published, so demand stays at 2; scores and total unchanged, rank 9 to 10 (SSCP now has the older Checked date) | ISC2 [exam outline PDF (effective 2024-06-15)](https://edge.sitecorecloud.io/internationf173-xmc4e73-prodbc0f-9660/media/Project/ISC2/Main/Media/documents/exam-outlines/CGRC-Exam_Outline-English.pdf), [outline page](https://www.isc2.org/certifications/cgrc/cgrc-certification-exam-outline), [CGRC page](https://www.isc2.org/certifications/cgrc), [CGRC knowledge check](https://cloud.connect.isc2.org/cgrc-quiz) |
