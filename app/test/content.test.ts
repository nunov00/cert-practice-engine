import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { PublicContent } from "@cpe/tools/build";

// Guards the paywall: the bundle the browser gets must hold only free-sample questions.
const content = JSON.parse(readFileSync(new URL("../src/generated/content.json", import.meta.url), "utf8")) as PublicContent;

test("generated content has the CISSP exam", () => {
  assert.ok(content.exams.some((e) => e.id === "cissp"));
});

test("free sample stays within the per-domain allowance", () => {
  for (const exam of content.exams) {
    for (const d of exam.domains) {
      const n = content.questions.filter((q) => q.exam === exam.id && q.domain === d.id).length;
      assert.ok(n <= exam.free_sample_per_domain, `${exam.id}/${d.id} ships ${n} questions`);
    }
  }
});

test("shipped questions carry no internal fields", () => {
  for (const q of content.questions) {
    assert.ok(!("provenance" in q) && !("status" in q) && !("sample" in q), q.id);
  }
});
