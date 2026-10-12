import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildPublicContent, PUBLIC_ACCESS, type PublicContent } from "@cpe/tools/build";

// Guards what the browser gets: the bundle must be exactly what tools/src/build.ts
// allows for the current access mode (decision 0004). The modes themselves are
// tested in tools/test/build.test.ts.
const content = JSON.parse(readFileSync(new URL("../src/generated/content.json", import.meta.url), "utf8")) as PublicContent;
const repo = fileURLToPath(new URL("../..", import.meta.url));

test("generated content has the CISSP exam", () => {
  assert.ok(content.exams.some((e) => e.id === "cissp"));
});

test("bundle matches the current access mode", () => {
  assert.equal(content.access, PUBLIC_ACCESS);
  assert.deepEqual(content, buildPublicContent(repo, PUBLIC_ACCESS));
});

test("free-sample mode stays within the per-domain allowance", () => {
  if (content.access !== "free-sample") return;
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
