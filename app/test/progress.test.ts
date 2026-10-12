import { test } from "node:test";
import assert from "node:assert/strict";
import { domainStats, drillOrder, emptyProgress, parseProgress, recordAttempt } from "../src/lib/progress.ts";

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
