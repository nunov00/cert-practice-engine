import { test } from "node:test";
import assert from "node:assert/strict";
import { allocate, formatClock, parseSavedTest, pickQuestions, timeLimitSeconds } from "../src/lib/exam-session.ts";

const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

test("allocate follows domain weights", () => {
  const domains = [
    { id: "d1", weight: 0.37, questionIds: ids("a", 50) },
    { id: "d2", weight: 0.21, questionIds: ids("b", 50) },
    { id: "d3", weight: 0.42, questionIds: ids("c", 50) },
  ];
  assert.deepEqual(allocate(domains, 90), { d1: 33, d2: 19, d3: 38 });
  assert.deepEqual(allocate(domains, 10), { d1: 4, d2: 2, d3: 4 });
});

test("allocate moves the shortfall to domains with questions left", () => {
  const domains = [
    { id: "d1", weight: 0.16, questionIds: ids("a", 20) },
    { id: "d2", weight: 0.1, questionIds: [] },
    { id: "d3", weight: 0.74, questionIds: ids("c", 3) },
  ];
  assert.deepEqual(allocate(domains, 150), { d1: 20, d2: 0, d3: 3 });
  assert.deepEqual(allocate(domains, 10), { d1: 7, d2: 0, d3: 3 });
});

test("pickQuestions returns distinct questions of the right size", () => {
  const domains = [
    { id: "d1", weight: 0.5, questionIds: ids("a", 30) },
    { id: "d2", weight: 0.5, questionIds: ids("b", 30) },
  ];
  const picked = pickQuestions(domains, 10);
  assert.equal(picked.length, 10);
  assert.equal(new Set(picked).size, 10);
  assert.equal(picked.filter((id) => id.startsWith("a")).length, 5);
});

test("time is in proportion to the real exam's pace", () => {
  assert.equal(timeLimitSeconds(90, { questions: 90, minutes: 150 }), 9000);
  assert.equal(timeLimitSeconds(10, { questions: 90, minutes: 150 }), 1000);
  assert.equal(timeLimitSeconds(10, { questions: 150, minutes: 180 }), 720);
});

test("formatClock", () => {
  assert.equal(formatClock(9000), "2:30:00");
  assert.equal(formatClock(65.2), "1:06");
  assert.equal(formatClock(-3), "0:00");
});

test("parseSavedTest rejects tests for other exams or with unknown questions", () => {
  const t = { version: 1, exam: "aair", kind: "quick", order: ["q1"], answers: {}, flagged: [], index: 0, deadline: 5 };
  const known = new Set(["q1"]);
  assert.ok(parseSavedTest(JSON.stringify(t), "aair", "quick", known));
  assert.equal(parseSavedTest(JSON.stringify(t), "cissp", "quick", known), null);
  assert.equal(parseSavedTest(JSON.stringify(t), "aair", "mock", known), null);
  assert.equal(parseSavedTest(JSON.stringify(t), "aair", "quick", new Set()), null);
  assert.equal(parseSavedTest("not json", "aair", "quick", known), null);
});
