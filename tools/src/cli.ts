import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { coverage, formatCoverage } from "./coverage.ts";
import { validateRepo } from "./validate.ts";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { root: { type: "string", default: "." } },
});
const [command, exam] = positionals;
const root = resolve(values.root!);

if (command === "validate") {
  const { issues, recipes, questions } = validateRepo(root);
  for (const i of issues) console.log(`${i.level.toUpperCase()} ${i.file}: ${i.message}`);
  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.length - errors;
  console.log(`\n${recipes.size} recipe(s), ${questions.length} question(s): ${errors} error(s), ${warnings} warning(s)`);
  process.exit(errors > 0 ? 1 : 0);
} else if (command === "coverage") {
  const { issues, recipes, questions } = validateRepo(root);
  if (issues.some((i) => i.level === "error")) console.log("Note: validation has errors; run `pnpm validate`.\n");
  for (const recipe of recipes.values()) {
    if (exam && recipe.exam.id !== exam) continue;
    console.log(formatCoverage(recipe, coverage(recipe, questions)), "\n");
  }
} else {
  console.error("usage: cli.ts <validate|coverage [exam]> [--root <repo>]");
  process.exit(2);
}
