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
