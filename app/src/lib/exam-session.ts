// Timed practice tests across a whole exam: the mock exam and the quick 10.
// Pure functions here; the saved-session wrapper is at the bottom.

export interface DomainPool {
  id: string;
  weight: number;
  questionIds: string[];
}

/**
 * How many questions each domain gets in a test of `size`: proportional to the
 * recipe weights (largest remainder), capped by what each domain has, with any
 * shortfall moved to domains that still have questions.
 */
export function allocate(domains: DomainPool[], size: number): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(domains.map((d) => [d.id, 0]));
  let left = Math.min(
    size,
    domains.reduce((n, d) => n + d.questionIds.length, 0),
  );
  while (left > 0) {
    const open = domains.filter((d) => out[d.id]! < d.questionIds.length);
    const weight = open.reduce((w, d) => w + d.weight, 0);
    const share = open.map((d) => {
      const exact = weight > 0 ? (left * d.weight) / weight : left / open.length;
      const room = d.questionIds.length - out[d.id]!;
      return { d, n: Math.min(Math.floor(exact), room), frac: exact - Math.floor(exact), room };
    });
    let given = share.reduce((n, s) => n + s.n, 0);
    // Hand out the remainder by largest fraction, then by weight.
    for (const s of [...share].sort((a, b) => b.frac - a.frac || b.d.weight - a.d.weight)) {
      if (given >= left) break;
      if (s.n < s.room) {
        s.n++;
        given++;
      }
    }
    for (const s of share) out[s.d.id]! += s.n;
    left -= given;
    if (given === 0) break;
  }
  return out;
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** A random test of up to `size` questions, weighted by domain, in random order. */
export function pickQuestions(domains: DomainPool[], size: number, random: () => number = Math.random): string[] {
  const counts = allocate(domains, size);
  const ids = domains.flatMap((d) => shuffle(d.questionIds, random).slice(0, counts[d.id]));
  return shuffle(ids, random);
}

/** Time for `count` questions at the real exam's pace, in whole seconds. */
export function timeLimitSeconds(count: number, mock: { questions: number; minutes: number }): number {
  return Math.round((mock.minutes * 60 * count) / mock.questions);
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export type TestKind = "mock" | "quick";

/** A test in progress, saved so a reload or a locked phone doesn't lose it. */
export interface SavedTest {
  version: 1;
  exam: string;
  kind: TestKind;
  order: string[];
  answers: Record<string, string>;
  flagged: string[];
  index: number;
  deadline: number; // epoch ms
}

export function parseSavedTest(text: string | null, exam: string, kind: TestKind, known: Set<string>): SavedTest | null {
  if (!text) return null;
  try {
    const t = JSON.parse(text) as SavedTest;
    if (t.version !== 1 || t.exam !== exam || t.kind !== kind) return null;
    if (!Array.isArray(t.order) || t.order.length === 0 || !t.order.every((id) => known.has(id))) return null;
    if (typeof t.deadline !== "number" || typeof t.answers !== "object" || t.answers === null) return null;
    return { ...t, flagged: Array.isArray(t.flagged) ? t.flagged : [], index: Math.min(t.index || 0, t.order.length - 1) };
  } catch {
    return null;
  }
}

const key = (exam: string, kind: TestKind) => `cpe.test.v1.${exam}.${kind}`;

export function loadTest(exam: string, kind: TestKind, known: Set<string>): SavedTest | null {
  try {
    return parseSavedTest(window.localStorage.getItem(key(exam, kind)), exam, kind, known);
  } catch {
    return null;
  }
}

export function saveTest(t: SavedTest): void {
  try {
    window.localStorage.setItem(key(t.exam, t.kind), JSON.stringify(t));
  } catch {
    // Storage blocked: the test still works, it just can't survive a reload.
  }
}

export function clearTest(exam: string, kind: TestKind): void {
  try {
    window.localStorage.removeItem(key(exam, kind));
  } catch {
    // Nothing to clear.
  }
}
