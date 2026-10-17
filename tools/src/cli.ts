import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parse } from "yaml";
import { writePublicContent } from "./build.ts";
import {
  changedQuestionFiles,
  formatCalibration,
  optionsOnlyVerdict,
  setOptionsOnly,
  writeCheckerPackets,
  type OptionsOnlyAnswer,
} from "./calibration.ts";
import { coverage, formatCoverage } from "./coverage.ts";
import { validateRepo } from "./validate.ts";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    root: { type: "string", default: "." },
    out: { type: "string" },
    since: { type: "string" },
  },
});
const [command, ...rest] = positionals;
const root = resolve(values.root!);
/** User-given paths resolve against where pnpm was started, not tools/. */
const userPath = (p: string) => resolve(process.env.INIT_CWD ?? ".", p);

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

if (command === "validate") {
  const since = values.since;
  const { issues, recipes, questions } = validateRepo(root, { since });
  for (const i of issues) console.log(`${i.level.toUpperCase()} ${i.file}: ${i.message}`);
  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.length - errors;
  const strict = since ? `, ${changedQuestionFiles(root, since).size} changed since ${since} (strict calibration checks)` : "";
  console.log(`\n${recipes.size} recipe(s), ${questions.length} question(s)${strict}: ${errors} error(s), ${warnings} warning(s)`);
  process.exit(errors > 0 ? 1 : 0);
} else if (command === "coverage") {
  const [exam] = rest;
  const { issues, recipes, questions } = validateRepo(root);
  if (issues.some((i) => i.level === "error")) console.log("Note: validation has errors; run `pnpm validate`.\n");
  for (const recipe of recipes.values()) {
    if (exam && recipe.exam.id !== exam) continue;
    console.log(formatCoverage(recipe, coverage(recipe, questions)), "\n");
  }
} else if (command === "calibration") {
  const [sub, arg] = rest;
  const { recipes, profiles, questions } = validateRepo(root);
  if (sub === undefined || sub === "report" || recipes.has(sub)) {
    const exam = recipes.has(sub ?? "") ? sub : arg;
    for (const recipe of recipes.values()) {
      if (exam && recipe.exam.id !== exam) continue;
      console.log(formatCalibration(recipe, profiles.get(recipe.exam.id), questions.map((q) => q.data)), "\n");
    }
  } else if (sub === "packets") {
    if (!values.since || !values.out) fail("usage: calibration packets --since <ref> --out <dir> [exam]");
    const changed = changedQuestionFiles(root, values.since);
    const picked = questions
      .filter((q) => changed.has(q.file) && q.data.status !== "retired" && (!arg || q.data.id.startsWith(`${arg}-`)))
      .map((q) => q.data);
    const out = writeCheckerPackets(picked, userPath(values.out));
    console.log(`wrote ${picked.length} question(s):\n  ${out.optionsOnly}\n  ${out.full}`);
  } else if (sub === "record") {
    if (!arg) fail("usage: calibration record <answers.yaml>");
    const answers = parse(readFileSync(userPath(arg), "utf8")) as Record<string, { options_only: OptionsOnlyAnswer }>;
    const byId = new Map(questions.map((q) => [q.data.id, q]));
    const tally = new Map<string, { obvious: number; n: number }>();
    for (const [id, a] of Object.entries(answers)) {
      const q = byId.get(id);
      if (!q) fail(`answers.yaml: no question ${id}`);
      if (!a?.options_only?.pick || typeof a.options_only.sure !== "boolean") {
        fail(`answers.yaml: ${id} needs options_only: { pick: <letter>, sure: true|false }`);
      }
      const verdict = optionsOnlyVerdict(q.data, a.options_only);
      const path = join(root, q.file);
      writeFileSync(path, setOptionsOnly(readFileSync(path, "utf8"), verdict));
      const exam = id.split("-")[0]!;
      const t = tally.get(exam) ?? { obvious: 0, n: 0 };
      tally.set(exam, { obvious: t.obvious + (verdict === "obvious" ? 1 : 0), n: t.n + 1 });
    }
    console.log("Options-only test (paste into the PR):\n\n| Exam | Obvious from options alone | Target |\n|---|---|---|");
    for (const [exam, t] of tally) {
      const max = profiles.get(exam)?.targets.options_only_obvious_max;
      const target = max === undefined ? "n/a" : `at most ${Math.round(max * 100)}%`;
      console.log(`| ${exam} | ${t.obvious}/${t.n} (${Math.round((t.obvious / t.n) * 100)}%) | ${target} |`);
    }
  } else {
    fail("usage: calibration [exam] | calibration packets --since <ref> --out <dir> [exam] | calibration record <answers.yaml>");
  }
} else if (command === "build") {
  const out = resolve(values.out ?? "content.json");
  const content = writePublicContent(root, out);
  console.log(`wrote ${out}: ${content.exams.length} exam(s), ${content.questions.length} free-sample question(s)`);
} else {
  fail("usage: cli.ts <validate [--since <ref>] | coverage [exam] | calibration ... | build --out <file>> [--root <repo>]");
}
