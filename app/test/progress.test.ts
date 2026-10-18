import { test } from "node:test";
import assert from "node:assert/strict";
import {
  domainStats,
  drillOrder,
  emptyProgress,
  forgetExam,
  missedIds,
  parseProgress,
  readiness,
  recentExams,
  visibleRecent,
  recordAttempt,
} from "../src/lib/progress.ts";

test("recordAttempt counts attempts and keeps the latest result", () => {
  let p = recordAttempt(emptyProgress(), "q1", false, 1);
  p = recordAttempt(p, "q1", true, 2);
  assert.deepEqual(p.attempts.q1, { seen: 2, correct: 1, last_correct: true, last_at: 2 });
});

test("domainStats counts distinct answered and last-correct questions", () => {
  let p = recordAttempt(emptyProgress(), "q1", true, 1);
  p = recordAttempt(p, "q2", false, 2);
  p = recordAttempt(p, "other", true, 3);
  assert.deepEqual(domainStats(["q1", "q2", "q3"], p), { total: 3, answered: 2, lastCorrect: 1 });
});

test("drillOrder puts unseen first, then missed, then correct oldest-first", () => {
  let p = recordAttempt(emptyProgress(), "right-old", true, 1);
  p = recordAttempt(p, "right-new", true, 5);
  p = recordAttempt(p, "missed", false, 3);
  const order = drillOrder(["right-new", "missed", "right-old", "unseen"], p, () => 0.5);
  assert.deepEqual(order, ["unseen", "missed", "right-old", "right-new"]);
});

test("parseProgress falls back to empty progress on bad input", () => {
  assert.deepEqual(parseProgress(null), emptyProgress());
  assert.deepEqual(parseProgress("not json"), emptyProgress());
  assert.deepEqual(parseProgress(JSON.stringify({ version: 2, attempts: {} })), emptyProgress());
  const good = recordAttempt(emptyProgress(), "q", true, 1);
  assert.deepEqual(parseProgress(JSON.stringify(good)), good);
});

test("readiness holds near 50% with few answers and bands against the target", () => {
  assert.deepEqual(readiness({ total: 20, answered: 0, lastCorrect: 0 }, 0.75), { score: 0, band: "not-started" });
  const three = readiness({ total: 20, answered: 3, lastCorrect: 3 }, 0.75);
  assert.ok(three.score < 0.65 && three.band === "getting-there", JSON.stringify(three));
  assert.equal(readiness({ total: 100, answered: 90, lastCorrect: 80 }, 0.75).band, "on-track");
  assert.equal(readiness({ total: 100, answered: 40, lastCorrect: 10 }, 0.75).band, "not-yet");
});

test("recentExams groups by exam, newest first; forgetExam clears one exam", () => {
  let p = recordAttempt(emptyProgress(), "cissp-d1-1.1-0001", true, 1);
  p = recordAttempt(p, "aair-d2-2.1-0001", false, 5);
  p = recordAttempt(p, "cissp-d1-1.2-0002", true, 3);
  assert.deepEqual(recentExams(p), [
    { exam: "aair", answered: 1, last_at: 5 },
    { exam: "cissp", answered: 2, last_at: 3 },
  ]);
  assert.deepEqual(Object.keys(forgetExam(p, "cissp").attempts), ["aair-d2-2.1-0001"]);
});

test("missedIds keeps questions whose latest answer was wrong", () => {
  let p = recordAttempt(emptyProgress(), "a", false, 1);
  p = recordAttempt(p, "b", false, 2);
  p = recordAttempt(p, "b", true, 3);
  assert.deepEqual(missedIds(["a", "b", "c"], p), ["a"]);
});

test("visibleRecent hides an exam until it is answered again", () => {
  const recent = [
    { exam: "aair", answered: 3, last_at: 100 },
    { exam: "cissp", answered: 1, last_at: 200 },
  ];
  assert.deepEqual(visibleRecent(recent, {}).map((r) => r.exam), ["aair", "cissp"]);
  assert.deepEqual(visibleRecent(recent, { aair: 150 }).map((r) => r.exam), ["cissp"]);
  assert.deepEqual(visibleRecent(recent, { aair: 100 }).map((r) => r.exam), ["cissp"]);
  assert.deepEqual(visibleRecent(recent, { aair: 50 }).map((r) => r.exam), ["aair", "cissp"]);
});
