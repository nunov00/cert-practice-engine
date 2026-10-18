import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import { execFileSync } from "node:child_process";
import { validateRepo, similarity } from "../src/validate.ts";
import { optionsOnlyVerdict, setOptionsOnly } from "../src/calibration.ts";
import { coverage } from "../src/coverage.ts";
import type { CalibrationProfile, Question, Recipe } from "../src/types.ts";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const cissp = parse(readFileSync(join(repo, "recipes/cissp/recipe.yaml"), "utf8")) as Recipe;
const cisspCalibration = parse(readFileSync(join(repo, "recipes/cissp/calibration.yaml"), "utf8")) as CalibrationProfile;

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

/** A throwaway repo with the real schemas, CISSP recipe and calibration profile plus the given questions. */
function fixture(questions: Question[], recipe: Recipe = cissp, calibration: CalibrationProfile | null = cisspCalibration): string {
  const root = mkdtempSync(join(tmpdir(), "cpe-"));
  cpSync(join(repo, "recipes/_schema"), join(root, "recipes/_schema"), { recursive: true });
  cpSync(join(repo, "bank/_schema"), join(root, "bank/_schema"), { recursive: true });
  mkdirSync(join(root, "recipes", recipe.exam.id), { recursive: true });
  writeFileSync(join(root, "recipes", recipe.exam.id, "recipe.yaml"), stringify(recipe));
  if (calibration) {
    const profile = { ...calibration, exam: recipe.exam.id, outline_version: recipe.exam.outline.version };
    writeFileSync(join(root, "recipes", recipe.exam.id, "calibration.yaml"), stringify(profile));
  }
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

/** The CISSP recipe as a preview: nothing the issuer hasn't published. */
function previewOf(recipe: Recipe): Recipe {
  const r = structuredClone(recipe);
  r.exam.outline.status = "preview";
  for (const d of r.domains) delete d.weight;
  delete r.format.delivery;
  delete r.format.questions;
  delete r.format.scoring;
  delete r.product.mock;
  return r;
}

test("a preview recipe leaves out weights, length, delivery, scoring and the mock", async () => {
  const preview = previewOf(cissp);
  assert.deepEqual(errors(fixture([question()], preview)), []);

  const withWeight = structuredClone(preview);
  withWeight.domains[0]!.weight = 0.5;
  assert.ok(errors(fixture([], withWeight)).some((m) => m.includes("leave out domain weights")));

  const withMock = structuredClone(preview);
  withMock.product.mock = cissp.product.mock;
  assert.ok(errors(fixture([], withMock)).some((m) => m.includes("leave out product.mock")));

  const { buildPublicContent } = await import("../src/build.ts");
  const exam = buildPublicContent(fixture([question()], preview), "open").exams[0]!;
  assert.equal(exam.preview, true);
  assert.equal(exam.mock, null);
  assert.ok(exam.domains.every((d) => d.weight === null));
});

test("an estimated pace is allowed only in a preview recipe", async () => {
  const pace = { questions: 90, minutes: 150, basis: "test" };
  const preview = previewOf(cissp);
  preview.product.estimated_pace = pace;
  assert.deepEqual(errors(fixture([question()], preview)), []);
  const { buildPublicContent } = await import("../src/build.ts");
  assert.deepEqual(buildPublicContent(fixture([question()], preview), "open").exams[0]!.estimated_pace, pace);

  const published = structuredClone(cissp);
  published.product.estimated_pace = pace;
  assert.ok(errors(fixture([], published)).some((m) => m.includes("estimated_pace is for preview recipes only")));
});

test("a published recipe needs weights, length, delivery, scoring and the mock", () => {
  const bad = previewOf(cissp);
  delete bad.exam.outline.status;
  const msgs = errors(fixture([], bad));
  for (const m of ["every domain needs a weight", "format.questions is required", "format.scoring is required", "product.mock is required"]) {
    assert.ok(msgs.includes(m), m);
  }
});

test("every recipe names a known subject area", () => {
  const missing = structuredClone(cissp) as Partial<Recipe["exam"]> & Recipe;
  delete (missing.exam as Partial<Recipe["exam"]>).topic;
  assert.ok(errors(fixture([], missing)).some((m) => m.includes("must have required property 'topic'")));
  const unknown = structuredClone(cissp);
  unknown.exam.topic = "underwater-basket-weaving";
  assert.ok(errors(fixture([], unknown)).some((m) => m.startsWith('exam.topic "underwater-basket-weaving" is not one of')));
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

test("a key much longer than every distractor is a warning", () => {
  const q = question({
    options: { A: "Insurance", B: "Present the assessment results to senior management for a treatment decision", C: "Firewall", D: "Pen test" },
  });
  const root = fixture([q]);
  assert.deepEqual(errors(root), []);
  assert.ok(warnings(root).some((m) => m.includes("balance option lengths")));
});

test("giveaway wording used only by distractors is a warning", () => {
  const q = question({
    options: { A: "Ban all insurance purchases", B: "Present the results to senior management", C: "Install a firewall, since it is cheap", D: "Run a penetration test" },
  });
  const root = fixture([q]);
  assert.deepEqual(errors(root), []);
  const w = warnings(root);
  assert.ok(w.some((m) => m.includes("only distractors (A) use absolute words")));
  assert.ok(w.some((m) => m.includes("only distractors (C) use a self-justifying clause")));
  assert.ok(!warnings(fixture([question()])).some((m) => m.includes("only distractors")));
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

test("public content never ships drafts or provenance; free-sample mode ships only sample questions", async () => {
  const { buildPublicContent } = await import("../src/build.ts");
  const root = fixture([
    question({ sample: true }),
    question({ id: "cissp-d1-1.9-0002", stem: "A different scenario entirely about vendor contracts and their review cadence.", sample: false }),
    question({ id: "cissp-d1-1.9-0003", stem: "Yet another distinct scenario on risk registers and how often to update them.", sample: true, status: "draft", provenance: { generated_by: "claude", run_id: "r", check_verdict: "pending" } }),
  ]);
  const sample = buildPublicContent(root, "free-sample");
  assert.equal(sample.access, "free-sample");
  assert.deepEqual(sample.questions.map((q) => q.id), ["cissp-d1-1.9-0001"]);
  assert.equal(sample.questions[0]!.domain, "d1");
  assert.ok(!("provenance" in sample.questions[0]!));
  assert.equal(sample.exams[0]!.published_questions, 2);

  const open = buildPublicContent(root, "open");
  assert.equal(open.access, "open");
  assert.deepEqual(open.questions.map((q) => q.id), ["cissp-d1-1.9-0001", "cissp-d1-1.9-0002"]);
  assert.ok(open.questions.every((q) => !("provenance" in q) && !("status" in q)));
});

// Difficulty calibration (docs/calibration/standard.md)

/** A fixture under git, with `changed` questions added in a commit after the base. */
function gitFixture(base: Question[], changed: Question[]): string {
  const root = fixture(base);
  const g = (...args: string[]) => execFileSync("git", ["-C", root, ...args], { stdio: "pipe" });
  g("init", "-q", "-b", "main");
  g("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "empty");
  g("add", "-A");
  g("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "base");
  g("branch", "base");
  for (const q of changed) {
    const [, domain] = q.id.split("-");
    mkdirSync(join(root, "bank/cissp", domain!), { recursive: true });
    writeFileSync(join(root, "bank/cissp", domain!, `${q.id}.yaml`), stringify(q));
  }
  return root;
}

const sinceErrors = (root: string) =>
  validateRepo(root, { since: "base" }).issues.filter((i) => i.level === "error").map((i) => i.message);

const checked = (n: number, options_only: "obvious" | "not_obvious") =>
  question({
    id: `cissp-d1-1.9-${String(n).padStart(4, "0")}`,
    stem: `Scenario ${n}: a company has finished a risk assessment of system ${n}. What should the security manager do FIRST?`,
    options: { A: "Buy cyber insurance", B: "Brief senior management", C: "Install a new firewall", D: "Run a penetration test" },
    provenance: { generated_by: "claude", run_id: "r", checked_by: "r-check", check_verdict: "pass", options_only },
  });

test("every recipe needs a calibration profile", () => {
  assert.ok(errors(fixture([], cissp, null)).some((m) => m.includes("calibration.yaml")));
});

test("a profile built on an older outline is a warning", () => {
  const old = { ...cissp, exam: { ...cissp.exam, outline: { ...cissp.exam.outline, version: "2027-01-01" } } };
  const root = fixture([], old);
  writeFileSync(join(root, "recipes/cissp/calibration.yaml"), stringify(cisspCalibration));
  assert.ok(warnings(root).some((m) => m.includes("recalibrate")));
});

test("unchanged questions only warn; changed ones must record the options-only test", () => {
  const unrecorded = question();
  assert.deepEqual(errors(fixture([unrecorded])), []);
  const root = gitFixture([], [unrecorded]);
  assert.ok(sinceErrors(root).some((m) => m.includes("provenance.options_only")));
  assert.deepEqual(sinceErrors(gitFixture([unrecorded], [])), []);
});

test("giveaway wording is an error on changed questions", () => {
  const q = checked(1, "not_obvious");
  q.options.A = "Buy insurance immediately for every system";
  assert.ok(sinceErrors(gitFixture([], [q])).some((m) => m.includes("absolute words")));
});

test("a changed batch fails when too many keys are obvious from the options", () => {
  const ten = (obvious: number) => Array.from({ length: 10 }, (_, i) => checked(i + 1, i < obvious ? "obvious" : "not_obvious"));
  assert.ok(sinceErrors(gitFixture([], ten(5))).some((m) => m.includes("obvious from the options alone")));
  assert.deepEqual(sinceErrors(gitFixture([], ten(4))), []);
});

test("the options-only verdict is obvious only when sure and right", () => {
  const q = question();
  assert.equal(optionsOnlyVerdict(q, { pick: "B", sure: true }), "obvious");
  assert.equal(optionsOnlyVerdict(q, { pick: "B", sure: false }), "not_obvious");
  assert.equal(optionsOnlyVerdict(q, { pick: "A", sure: true }), "not_obvious");
});

test("recording the verdict keeps the file as written", () => {
  const text = "id: x\nprovenance:\n  run_id: r\n  check_verdict: pass\n";
  assert.equal(setOptionsOnly(text, "obvious"), "id: x\nprovenance:\n  run_id: r\n  check_verdict: pass\n  options_only: obvious\n");
  assert.equal(setOptionsOnly(setOptionsOnly(text, "obvious"), "not_obvious"), setOptionsOnly(text, "not_obvious"));
});
