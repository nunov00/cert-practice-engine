import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import { validateRepo, similarity } from "../src/validate.ts";
import { coverage } from "../src/coverage.ts";
import type { Question, Recipe } from "../src/types.ts";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const cissp = parse(readFileSync(join(repo, "recipes/cissp/recipe.yaml"), "utf8")) as Recipe;

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: "cissp-d1-1.9-0001",
    subdomain: "1.9",
    difficulty: "medium",
    stem: "A company has finished a risk assessment of its payroll system. What should the security manager do FIRST?",
    options: { A: "Buy insurance", B: "Present the results to senior management", C: "Install a firewall", D: "Run a penetration test" },
    answer: "B",
    explanation: {
      why_correct: "Risk treatment decisions belong to management, who must see the results first.",
      why_not: { A: "Transfer is one treatment option, decided later.", C: "A control chosen before a decision.", D: "Testing does not decide treatment." },
    },
    status: "published",
    outline_version: "2024-04-15",
    sample: false,
    provenance: { generated_by: "claude", run_id: "test-run", checked_by: "test-check", check_verdict: "pass" },
    ...overrides,
  };
}

/** A throwaway repo with the real schemas and CISSP recipe plus the given questions. */
function fixture(questions: Question[], recipe: Recipe = cissp): string {
  const root = mkdtempSync(join(tmpdir(), "cpe-"));
  cpSync(join(repo, "recipes/_schema"), join(root, "recipes/_schema"), { recursive: true });
  cpSync(join(repo, "bank/_schema"), join(root, "bank/_schema"), { recursive: true });
  mkdirSync(join(root, "recipes", recipe.exam.id), { recursive: true });
  writeFileSync(join(root, "recipes", recipe.exam.id, "recipe.yaml"), stringify(recipe));
  for (const q of questions) {
    const [exam, domain] = q.id.split("-");
    const dir = join(root, "bank", exam!, domain!);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${q.id}.yaml`), stringify(q));
  }
  return root;
}

const errors = (root: string) => validateRepo(root).issues.filter((i) => i.level === "error").map((i) => i.message);
const warnings = (root: string) => validateRepo(root).issues.filter((i) => i.level === "warning").map((i) => i.message);

test("the real repo validates", () => {
  assert.deepEqual(errors(repo), []);
});

test("a well-formed question passes", () => {
  assert.deepEqual(errors(fixture([question()])), []);
});

test("recipe weights must sum to 1", () => {
  const bad = structuredClone(cissp);
  bad.domains[0]!.weight = 0.2;
  assert.ok(errors(fixture([], bad)).some((m) => m.includes("domain weights sum")));
});

test("subdomain targets must add up to the bank target", () => {
  const bad = structuredClone(cissp);
  bad.domains[0]!.subdomains[0]!.target_questions += 1;
  assert.ok(errors(fixture([], bad)).some((m) => m.includes("target_questions sum")));
});

test("subdomain must sit under its domain number", () => {
  const bad = structuredClone(cissp);
  bad.domains[0]!.subdomains[0]!.id = "2.99";
  assert.ok(errors(fixture([], bad)).some((m) => m.includes("is listed under d1")));
});

test("answer must be an option and why_not must cover the other options", () => {
  const q = question({ explanation: { why_correct: "Management decides how to treat risk.", why_not: { A: "x", C: "y" } } });
  assert.ok(errors(fixture([q])).some((m) => m.includes("why_not must cover")));
});

test("option count must match the recipe", () => {
  const q = question({ options: { A: "one", B: "two", C: "three" }, explanation: { why_correct: "Management decides how to treat risk.", why_not: { A: "x", C: "y" } } });
  assert.ok(errors(fixture([q])).some((m) => m.includes("options must be exactly A, B, C, D")));
});

test("all/none of the above is rejected", () => {
  const q = question({ options: { A: "All of the above", B: "Present the results", C: "Firewall", D: "Pen test" } });
  assert.ok(errors(fixture([q])).some((m) => m.includes("all/none of the above")));
});

test("id, subdomain and location must agree with the recipe", () => {
  assert.ok(errors(fixture([question({ id: "cissp-d1-1.99-0001", subdomain: "1.99" })])).some((m) => m.includes("not in the cissp recipe")));
  assert.ok(errors(fixture([question({ subdomain: "1.8" })])).some((m) => m.includes("id says subdomain")));
});

test("published questions need a passing independent check", () => {
  const q = question({ provenance: { generated_by: "claude", run_id: "r", check_verdict: "pending" } });
  assert.ok(errors(fixture([q])).some((m) => m.includes("check_verdict: pass")));
  assert.deepEqual(errors(fixture([{ ...q, status: "draft" }])), []);
});

test("an outdated outline version is a warning, not an error", () => {
  const root = fixture([question({ outline_version: "2021-05-01" })]);
  assert.deepEqual(errors(root), []);
  assert.ok(warnings(root).some((m) => m.includes("needs re-check")));
});

test("exact duplicate stems are errors, near duplicates are warnings", () => {
  const a = question();
  const b = question({ id: "cissp-d1-1.9-0002" });
  assert.ok(errors(fixture([a, b])).some((m) => m.includes("same stem")));

  const c = question({ id: "cissp-d1-1.9-0003", stem: a.stem.replace("FIRST", "INITIALLY") });
  const root = fixture([a, c]);
  assert.deepEqual(errors(root), []);
  assert.ok(warnings(root).some((m) => m.includes("similar to cissp-d1-1.9-0001")));
});

test("published free samples per domain are capped by the recipe", () => {
  const qs = Array.from({ length: 11 }, (_, i) =>
    question({ id: `cissp-d1-1.9-${String(i + 1).padStart(4, "0")}`, stem: `Scenario number ${i} about a completely different risk topic ${"x".repeat(i)}`, sample: true }),
  );
  assert.ok(errors(fixture(qs)).some((m) => m.includes("recipe allows 10")));
});

test("similarity is 1 for identical text and low for unrelated text", () => {
  assert.equal(similarity("the quick brown fox jumps", "The quick, brown fox jumps!"), 1);
  assert.ok(similarity("the quick brown fox jumps", "an entirely different sentence here") < 0.1);
});

test("coverage counts published and pending against targets", () => {
  const rows = coverage(cissp, [
    { file: "x", data: question() },
    { file: "y", data: question({ id: "cissp-d1-1.9-0002", status: "draft" }) },
  ]);
  const row = rows.find((r) => r.subdomain === "1.9")!;
  assert.equal(row.published, 1);
  assert.equal(row.pending, 1);
  assert.equal(row.gap, row.target - 1);
  assert.equal(rows.reduce((a, r) => a + r.target, 0), cissp.bank.target_total);
});
