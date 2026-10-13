// Learner progress for the free sample, kept in the browser (no account yet).
// Pure functions here; the storage wrapper is at the bottom.

export interface Attempt {
  seen: number;
  correct: number;
  last_correct: boolean;
  last_at: number; // epoch ms
}

export interface Progress {
  version: 1;
  attempts: Record<string, Attempt>;
}

export const emptyProgress = (): Progress => ({ version: 1, attempts: {} });

export function recordAttempt(progress: Progress, questionId: string, correct: boolean, now = Date.now()): Progress {
  const prev = progress.attempts[questionId];
  return {
    ...progress,
    attempts: {
      ...progress.attempts,
      [questionId]: {
        seen: (prev?.seen ?? 0) + 1,
        correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
        last_correct: correct,
        last_at: now,
      },
    },
  };
}

export interface DomainStats {
  total: number; // questions available
  answered: number; // distinct questions answered at least once
  lastCorrect: number; // distinct questions whose latest answer was right
}

export function domainStats(questionIds: string[], progress: Progress): DomainStats {
  let answered = 0;
  let lastCorrect = 0;
  for (const id of questionIds) {
    const a = progress.attempts[id];
    if (!a) continue;
    answered++;
    if (a.last_correct) lastCorrect++;
  }
  return { total: questionIds.length, answered, lastCorrect };
}

export type Band = "not-started" | "not-yet" | "getting-there" | "on-track";

export interface Readiness {
  /** 0..1, accuracy pulled toward 50% while few questions are answered. */
  score: number;
  band: Band;
}

/** Answers that count as much as the prior when shrinking toward 50%. */
const PRIOR_WEIGHT = 10;

/**
 * Per-domain readiness (proposal 0001 §6.5): accuracy on the latest answer to
 * each question, shrunk toward 50% when few are answered, so 3 of 3 right does
 * not read as ready. `target` is the recipe's `min_accuracy_per_domain`.
 * Phase 5 adds recency weighting and the exam-wide "looks ready" check.
 */
export function readiness(stats: DomainStats, target: number): Readiness {
  if (stats.answered === 0) return { score: 0, band: "not-started" };
  const score = (stats.lastCorrect + PRIOR_WEIGHT * 0.5) / (stats.answered + PRIOR_WEIGHT);
  const band = score >= target ? "on-track" : score >= target - 0.15 ? "getting-there" : "not-yet";
  return { score, band };
}

export const BAND_LABEL: Record<Band, string> = {
  "not-started": "Not started",
  "not-yet": "Not yet",
  "getting-there": "Getting there",
  "on-track": "On track",
};

/** Exams with at least one answer on this device, most recent first. Question IDs start with the exam ID. */
export function recentExams(progress: Progress): { exam: string; answered: number; last_at: number }[] {
  const byExam = new Map<string, { answered: number; last_at: number }>();
  for (const [id, a] of Object.entries(progress.attempts)) {
    const exam = id.split("-")[0]!;
    const cur = byExam.get(exam) ?? { answered: 0, last_at: 0 };
    byExam.set(exam, { answered: cur.answered + 1, last_at: Math.max(cur.last_at, a.last_at) });
  }
  return [...byExam].map(([exam, v]) => ({ exam, ...v })).sort((a, b) => b.last_at - a.last_at);
}

/** Drops every answer for one exam. */
export function forgetExam(progress: Progress, examId: string): Progress {
  const attempts = Object.fromEntries(Object.entries(progress.attempts).filter(([id]) => !id.startsWith(`${examId}-`)));
  return { ...progress, attempts };
}

/** Question IDs whose latest answer was wrong. */
export function missedIds(questionIds: string[], progress: Progress): string[] {
  return questionIds.filter((id) => progress.attempts[id]?.last_correct === false);
}

/**
 * Drill order: never-seen first, then last answered wrong, then the rest
 * oldest-first. `random` breaks ties so repeat drills don't feel identical.
 */
export function drillOrder(questionIds: string[], progress: Progress, random: () => number = Math.random): string[] {
  const rank = (id: string) => {
    const a = progress.attempts[id];
    if (!a) return 0;
    return a.last_correct ? 2 : 1;
  };
  return questionIds
    .map((id) => ({ id, rank: rank(id), at: progress.attempts[id]?.last_at ?? 0, tie: random() }))
    .sort((x, y) => x.rank - y.rank || x.at - y.at || x.tie - y.tie)
    .map((x) => x.id);
}

export function parseProgress(text: string | null): Progress {
  if (!text) return emptyProgress();
  try {
    const data = JSON.parse(text) as Partial<Progress>;
    if (data.version !== 1 || typeof data.attempts !== "object" || data.attempts === null) return emptyProgress();
    return { version: 1, attempts: data.attempts };
  } catch {
    return emptyProgress();
  }
}

const KEY = "cpe.progress.v1";

export function loadProgress(): Progress {
  try {
    return parseProgress(window.localStorage.getItem(KEY));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: Progress): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Private mode or storage blocked: progress just isn't kept.
  }
}
