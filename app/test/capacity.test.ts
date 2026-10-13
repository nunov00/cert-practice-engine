import { test } from "node:test";
import assert from "node:assert/strict";
import { assess, countRedirects, type Measure } from "../scripts/capacity.ts";

const MiB = 1024 * 1024;
const small: Measure = {
  assetFiles: 27,
  largestAsset: { path: "a.js", bytes: 0.2 * MiB },
  workerBytes: 5 * MiB,
  workerGzipBytes: 1 * MiB,
  staticRedirects: 0,
  dynamicRedirects: 0,
};

test("today's build is within budget", () => {
  assert.ok(assess(small).every((r) => r.level === "ok"));
});

test("over budget warns, over the Free limit fails", () => {
  const rows = assess({ ...small, assetFiles: 5_000, workerBytes: 65 * MiB });
  const level = (key: string) => rows.find((r) => r.rule.key === key)?.level;
  assert.equal(level("assetFiles"), "over-budget");
  assert.equal(level("workerBytes"), "over-limit");
  assert.equal(level("largestAssetBytes"), "ok");
});

test("gzip size has a budget but no Cloudflare limit", () => {
  const row = assess({ ...small, workerGzipBytes: 50 * MiB }).find((r) => r.rule.key === "workerGzipBytes");
  assert.equal(row?.level, "over-budget");
});

test("redirect rules with a splat or placeholder count as dynamic", () => {
  const text = "# comment\n/old /new 301\n/blog/* /posts/:splat 301\n/u/:id /users/:id\n\n";
  assert.deepEqual(countRedirects(text), { static: 1, dynamic: 2 });
});
