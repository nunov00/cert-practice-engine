import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, sep } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject } from "ajv";
import { parse } from "yaml";
import { isLoadError, loadQuestions, loadRecipes, type Loaded } from "./load.ts";
import { changedQuestionFiles, checkCalibration, checkChangedBatch, loadCalibration } from "./calibration.ts";
import { TOPICS } from "./topics.ts";
import type { CalibrationProfile, Issue, Question, Recipe } from "./types.ts";

const EPS = 1e-9;
const NEAR_DUPLICATE_THRESHOLD = 0.8;
/** Warn when the key is this much longer than every distractor (a test-wise giveaway). */
const KEY_LENGTH_RATIO = 1.5;

/**
 * Wording that marks an option as wrong to a test-wise reader when only distractors use it:
 * absolute words ("ban all…", "every…") and options that justify themselves ("…, since…").
 */
export const GIVEAWAY_CUES: { name: string; pattern: RegExp }[] = [
  { name: "absolute words (all, every, never…)", pattern: /\b(all|every|never|always|immediately|indefinitely|at once|ban)\b/i },
  { name: "a self-justifying clause (since/because…)", pattern: /\b(since|because)\b/i },
];

function compileSchema(ajv: Ajv2020, root: string, rel: string) {
  return ajv.compile(JSON.parse(readFileSync(join(root, rel), "utf8")));
}

function schemaIssues(file: string, errors: ErrorObject[] | null | undefined): Issue[] {
  return (errors ?? []).map((e) => ({
    level: "error",
    file,
    message: `schema: ${e.instancePath || "/"} ${e.message ?? "is invalid"}`,
  }));
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const isPreview = (recipe: Recipe) => recipe.exam.outline.status === "preview";

/** Rules from the recipe format that JSON Schema can't express. */
export function checkRecipe(recipe: Recipe, file: string): Issue[] {
  const issues: Issue[] = [];
  const err = (message: string) => issues.push({ level: "error", file, message });

  const expectedDir = recipe.exam.id;
  if (basename(dirname(file)) !== expectedDir) {
    err(`recipe for exam "${recipe.exam.id}" must live in recipes/${expectedDir}/`);
  }
  if (!TOPICS.some((t) => t.id === recipe.exam.topic)) {
    err(`exam.topic "${recipe.exam.topic}" is not one of ${TOPICS.map((t) => t.id).join(", ")} (tools/src/topics.ts)`);
  }

  if (isPreview(recipe)) {
    // Nothing the issuer hasn't published may appear, so nothing is invented.
    if (recipe.domains.some((d) => d.weight !== undefined)) {
      err(`preview recipe: leave out domain weights until the outline is published`);
    }
    for (const k of ["delivery", "questions", "scoring"] as const) {
      if (recipe.format[k] !== undefined) err(`preview recipe: leave out format.${k} until the outline is published`);
    }
    if (recipe.product.mock) err(`preview recipe: leave out product.mock until the outline is published`);
  } else {
    if (recipe.product.estimated_pace) err(`product.estimated_pace is for preview recipes only; use product.mock`);
    if (recipe.domains.some((d) => d.weight === undefined)) err(`every domain needs a weight`);
    else {
      const weights = sum(recipe.domains.map((d) => d.weight!));
      if (Math.abs(weights - 1) > EPS) err(`domain weights sum to ${weights}, expected 1.0`);
    }
    for (const k of ["delivery", "questions", "scoring"] as const) {
      if (recipe.format[k] === undefined) err(`format.${k} is required`);
    }
    if (!recipe.product.mock) err(`product.mock is required`);
  }

  const mix = sum(Object.values(recipe.bank.difficulty_mix));
  if (Math.abs(mix - 1) > EPS) err(`bank.difficulty_mix sums to ${mix}, expected 1.0`);

  const domainIds = new Set<string>();
  const subIds = new Set<string>();
  for (const d of recipe.domains) {
    if (domainIds.has(d.id)) err(`duplicate domain id ${d.id}`);
    domainIds.add(d.id);
    const num = d.id.slice(1);
    for (const s of d.subdomains) {
      if (!s.id.startsWith(`${num}.`)) err(`subdomain ${s.id} is listed under ${d.id}`);
      if (subIds.has(s.id)) err(`duplicate subdomain id ${s.id}`);
      subIds.add(s.id);
    }
  }

  const targets = sum(recipe.domains.flatMap((d) => d.subdomains.map((s) => s.target_questions)));
  if (targets !== recipe.bank.target_total) {
    err(`subdomain target_questions sum to ${targets}, bank.target_total is ${recipe.bank.target_total}`);
  }

  const q = recipe.format.questions;
  if (q && typeof q === "object" && q.min > q.max) err(`format.questions min > max`);

  return issues;
}

/** How many times longer the key is than the longest distractor. */
export function keyLengthRatio(q: Question): number {
  const keyLength = q.options[q.answer]?.length ?? 0;
  const longestWrong = Math.max(0, ...Object.keys(q.options).filter((k) => k !== q.answer).map((k) => q.options[k]!.length));
  return longestWrong > 0 ? keyLength / longestWrong : 0;
}

/** Giveaway cues used only by distractors, as "<cue> (letters)". */
export function giveawayCues(q: Question): { name: string; options: string[] }[] {
  const key = q.options[q.answer] ?? "";
  const wrong = Object.keys(q.options).filter((k) => k !== q.answer).sort();
  const out: { name: string; options: string[] }[] = [];
  for (const cue of GIVEAWAY_CUES) {
    const cued = wrong.filter((k) => cue.pattern.test(q.options[k] ?? ""));
    if (cued.length > 0 && !cue.pattern.test(key)) out.push({ name: cue.name, options: cued });
  }
  return out;
}

export const stemWords = (q: Question) => q.stem.trim().split(/\s+/).length;

export interface QuestionCheckOptions {
  /**
   * The question is new or changed in this PR (`--since`): calibration cues
   * become errors and the options-only result must be recorded.
   */
  strict?: boolean;
  profile?: CalibrationProfile;
}

/** Rules linking one question to its recipe and its location in bank/. */
export function checkQuestion(q: Question, file: string, recipe: Recipe | undefined, opts: QuestionCheckOptions = {}): Issue[] {
  const issues: Issue[] = [];
  const err = (message: string) => issues.push({ level: "error", file, message });
  const warn = (message: string) => issues.push({ level: "warning", file, message });
  const strict = opts.strict === true && q.status !== "retired";
  const cue = strict ? err : warn;

  if (basename(file).replace(/\.ya?ml$/, "") !== q.id) err(`file name must be ${q.id}.yaml`);

  const [exam, domain, subdomain] = q.id.split("-");
  const parts = file.split(sep).join("/").split("/");
  // bank/<exam>/<domain>/<id>.yaml
  if (parts.length !== 4 || parts[0] !== "bank" || parts[1] !== exam || parts[2] !== domain) {
    err(`must live at bank/${exam}/${domain}/${q.id}.yaml`);
  }
  if (subdomain !== q.subdomain) err(`id says subdomain ${subdomain}, field says ${q.subdomain}`);
  if (domain && !q.subdomain.startsWith(`${domain.slice(1)}.`)) {
    err(`subdomain ${q.subdomain} is not in domain ${domain}`);
  }

  if (!recipe) {
    err(`no recipe found for exam "${exam}"`);
    return issues;
  }

  const dom = recipe.domains.find((d) => d.id === domain);
  if (!dom) err(`domain ${domain} is not in the ${exam} recipe`);
  else if (!dom.subdomains.some((s) => s.id === q.subdomain)) {
    err(`subdomain ${q.subdomain} is not in the ${exam} recipe`);
  }

  const keys = Object.keys(q.options).sort();
  const n = recipe.style.options_per_question;
  const expectedKeys = "ABCDEF".slice(0, n).split("");
  if (keys.join() !== expectedKeys.join()) {
    err(`options must be exactly ${expectedKeys.join(", ")} (recipe: ${n} per question)`);
  }
  if (!(q.answer in q.options)) err(`answer ${q.answer} is not one of the options`);

  const wrong = keys.filter((k) => k !== q.answer);
  const whyNot = Object.keys(q.explanation.why_not).sort();
  if (whyNot.join() !== wrong.join()) {
    err(`explanation.why_not must cover exactly the wrong options (${wrong.join(", ")})`);
  }

  const texts = Object.values(q.options).map(normalise);
  if (new Set(texts).size !== texts.length) err(`two options have the same text`);
  if (texts.some((t) => /\b(all|none) of the above\b/.test(t))) {
    err(`"all/none of the above" options are not allowed`);
  }

  const ratio = keyLengthRatio(q);
  if (ratio > KEY_LENGTH_RATIO) {
    cue(`answer is ${ratio.toFixed(1)}x longer than any distractor; balance option lengths`);
  }

  for (const c of giveawayCues(q)) {
    cue(`only distractors (${c.options.join(", ")}) use ${c.name}; a test-wise reader can rule them out without the stem`);
  }

  if (strict) {
    if (q.status === "published" && !q.provenance.options_only) {
      err(`new or changed published question needs provenance.options_only from the checker's options-only test (docs/calibration/standard.md)`);
    }
    const range = opts.profile?.targets.stem_words;
    const words = stemWords(q);
    if (range && (words < range.min || words > range.max)) {
      warn(`stem has ${words} words; the ${recipe.exam.id} calibration profile expects ${range.min} to ${range.max}`);
    }
  }

  if (q.outline_version !== recipe.exam.outline.version && q.status !== "retired") {
    warn(`written against outline ${q.outline_version}, recipe is on ${recipe.exam.outline.version}; needs re-check`);
  }

  if (q.status === "published" && recipe.bank.review.independent_check && q.provenance.check_verdict !== "pass") {
    err(`published questions need provenance.check_verdict: pass`);
  }
  if (q.provenance.check_verdict !== "pending" && !q.provenance.checked_by) {
    err(`provenance.checked_by is required once check_verdict is ${q.provenance.check_verdict}`);
  }

  return issues;
}

export function normalise(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function shingles(text: string, size = 3): Set<string> {
  const words = normalise(text).split(" ");
  const out = new Set<string>();
  if (words.length < size) out.add(words.join(" "));
  for (let i = 0; i + size <= words.length; i++) out.add(words.slice(i, i + size).join(" "));
  return out;
}

export function similarity(a: string, b: string): number {
  const sa = shingles(a);
  const sb = shingles(b);
  let inter = 0;
  for (const s of sa) if (sb.has(s)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/** Exact duplicates are errors; near-duplicates are warnings for the reviewer. */
export function checkDuplicates(questions: Loaded<Question>[]): Issue[] {
  const issues: Issue[] = [];
  const live = questions.filter((q) => q.data.status !== "retired");
  const seenId = new Map<string, string>();
  for (const q of questions) {
    const prev = seenId.get(q.data.id);
    if (prev) issues.push({ level: "error", file: q.file, message: `id ${q.data.id} also used by ${prev}` });
    seenId.set(q.data.id, q.file);
  }
  const prepared = live.map((q) => ({ q, norm: normalise(q.data.stem), sh: shingles(q.data.stem) }));
  for (let i = 0; i < prepared.length; i++) {
    for (let j = i + 1; j < prepared.length; j++) {
      const a = prepared[i]!;
      const b = prepared[j]!;
      if (a.norm === b.norm) {
        issues.push({ level: "error", file: b.q.file, message: `same stem as ${a.q.data.id}` });
        continue;
      }
      let inter = 0;
      for (const s of a.sh) if (b.sh.has(s)) inter++;
      const sim = inter / (a.sh.size + b.sh.size - inter);
      if (sim >= NEAR_DUPLICATE_THRESHOLD) {
        issues.push({
          level: "warning",
          file: b.q.file,
          message: `stem is ${Math.round(sim * 100)}% similar to ${a.q.data.id}`,
        });
      }
    }
  }
  return issues;
}

/** Published free-sample questions per domain must not exceed the recipe allowance. */
export function checkSampleSize(questions: Loaded<Question>[], recipes: Map<string, Recipe>): Issue[] {
  const counts = new Map<string, number>();
  for (const q of questions) {
    if (!q.data.sample || q.data.status !== "published") continue;
    const [exam, domain] = q.data.id.split("-");
    const key = `${exam}/${domain}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const issues: Issue[] = [];
  for (const [key, n] of counts) {
    const [exam] = key.split("/");
    const limit = recipes.get(exam!)?.product.free_sample_per_domain;
    if (limit !== undefined && n > limit) {
      issues.push({ level: "error", file: `bank/${key}/`, message: `${n} published sample questions, recipe allows ${limit}` });
    }
  }
  return issues;
}

export interface ValidationResult {
  issues: Issue[];
  recipes: Map<string, Recipe>;
  profiles: Map<string, CalibrationProfile>;
  questions: Loaded<Question>[];
}

export const RESERVED_IDS_FILE = "bank/_reserved-ids.yaml";
const ID_PATTERN = /^[a-z0-9]+-d\d+-\d+\.\d+-\d{4}$/;

/** IDs dropped before reaching main (bank/_reserved-ids.yaml); they may never be given to a new question. */
export function loadReservedIds(root: string): { ids: Set<string>; issues: Issue[] } {
  const ids = new Set<string>();
  const issues: Issue[] = [];
  const path = join(root, RESERVED_IDS_FILE);
  if (!existsSync(path)) return { ids, issues };
  const err = (message: string) => issues.push({ level: "error", file: RESERVED_IDS_FILE, message });
  let data: unknown;
  try {
    data = parse(readFileSync(path, "utf8"));
  } catch (e) {
    err(`YAML parse error: ${(e as Error).message}`);
    return { ids, issues };
  }
  const list = (data as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(list)) {
    err("expected an `ids:` list");
    return { ids, issues };
  }
  for (const id of list) {
    if (typeof id !== "string" || !ID_PATTERN.test(id)) err(`not a question ID: ${JSON.stringify(id)}`);
    else if (ids.has(id)) err(`${id} is listed twice`);
    else ids.add(id);
  }
  return { ids, issues };
}

export interface ValidateOptions {
  /** Git ref (e.g. origin/main): questions changed since its merge base get the strict calibration checks. */
  since?: string;
}

export function validateRepo(root: string, opts: ValidateOptions = {}): ValidationResult {
  const ajv = new Ajv2020({ allErrors: true });
  const recipeSchema = compileSchema(ajv, root, "recipes/_schema/recipe.schema.json");
  const calibrationSchema = compileSchema(ajv, root, "recipes/_schema/calibration.schema.json");
  const questionSchema = compileSchema(ajv, root, "bank/_schema/question.schema.json");
  const issues: Issue[] = [];
  const recipes = new Map<string, Recipe>();
  const profiles = new Map<string, CalibrationProfile>();
  const questions: Loaded<Question>[] = [];
  const changed = opts.since === undefined ? undefined : changedQuestionFiles(root, opts.since);
  const reserved = loadReservedIds(root);
  issues.push(...reserved.issues);

  for (const r of loadRecipes(root)) {
    if (isLoadError(r)) {
      issues.push({ level: "error", ...r });
      continue;
    }
    if (!recipeSchema(r.data)) {
      issues.push(...schemaIssues(r.file, recipeSchema.errors));
      continue;
    }
    const recipe = r.data as Recipe;
    issues.push(...checkRecipe(recipe, r.file));
    recipes.set(recipe.exam.id, recipe);

    // Every exam needs a difficulty calibration profile before it can pass CI.
    const c = loadCalibration(root, recipe.exam.id);
    if (c === undefined) {
      issues.push({
        level: "error",
        file: r.file,
        message: `no recipes/${recipe.exam.id}/calibration.yaml; calibrate difficulty first (docs/calibration/standard.md)`,
      });
    } else if (isLoadError(c)) {
      issues.push({ level: "error", ...c });
    } else if (!calibrationSchema(c.data)) {
      issues.push(...schemaIssues(c.file, calibrationSchema.errors));
    } else {
      const profile = c.data as CalibrationProfile;
      issues.push(...checkCalibration(profile, recipe, c.file));
      profiles.set(recipe.exam.id, profile);
    }
  }

  for (const q of loadQuestions(root)) {
    if (isLoadError(q)) {
      issues.push({ level: "error", ...q });
      continue;
    }
    if (!questionSchema(q.data)) {
      issues.push(...schemaIssues(q.file, questionSchema.errors));
      continue;
    }
    const question = q.data as Question;
    const exam = question.id.split("-")[0]!;
    if (reserved.ids.has(question.id)) {
      issues.push({
        level: "error",
        file: q.file,
        message: `${question.id} was dropped earlier and is reserved (${RESERVED_IDS_FILE}); take the next free number above it`,
      });
    }
    const strict = changed?.has(q.file) ?? false;
    issues.push(...checkQuestion(question, q.file, recipes.get(exam), { strict, profile: profiles.get(exam) }));
    questions.push({ file: q.file, data: question });
  }

  if (changed) issues.push(...checkChangedBatch(questions.filter((q) => changed.has(q.file)), profiles));

  issues.push(...checkDuplicates(questions));
  issues.push(...checkSampleSize(questions, recipes));
  return { issues, recipes, profiles, questions };
}
