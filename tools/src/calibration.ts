import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "yaml";
import type { Loaded, LoadError } from "./load.ts";
import type { CalibrationProfile, Issue, Question, Recipe } from "./types.ts";
import { giveawayCues, keyLengthRatio, stemWords } from "./validate.ts";

/** Below this many checked questions a batch's options-only share only warns: one item swings it too far. */
export const MIN_BATCH_FOR_RATE = 10;

/** Capitalised ranking qualifiers, as the official samples use them. */
const QUALIFIER = /\b(MOST|BEST|FIRST|PRIMARY|PRIMARILY|GREATEST|LEAST|NEXT|MAIN|BIGGEST)\b/;
const SEQUENCING = /\b(FIRST|NEXT)\b/;

/** recipes/<exam>/calibration.yaml, or undefined when it does not exist. */
export function loadCalibration(root: string, exam: string): Loaded<unknown> | LoadError | undefined {
  const path = join(root, "recipes", exam, "calibration.yaml");
  if (!existsSync(path)) return undefined;
  const file = relative(root, path);
  try {
    return { file, data: parse(readFileSync(path, "utf8")) };
  } catch (err) {
    return { file, message: `YAML parse error: ${(err as Error).message}` };
  }
}

/** Rules linking a calibration profile to its recipe. */
export function checkCalibration(profile: CalibrationProfile, recipe: Recipe, file: string): Issue[] {
  const issues: Issue[] = [];
  if (profile.exam !== recipe.exam.id) {
    issues.push({ level: "error", file, message: `profile is for exam "${profile.exam}", recipe is "${recipe.exam.id}"` });
  }
  if (profile.outline_version !== recipe.exam.outline.version) {
    issues.push({
      level: "warning",
      file,
      message: `calibrated against outline ${profile.outline_version}, recipe is on ${recipe.exam.outline.version}; recalibrate`,
    });
  }
  const { min, max } = profile.targets.stem_words;
  if (min > max) issues.push({ level: "error", file, message: `targets.stem_words min > max` });
  return issues;
}

function git(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/**
 * Question files added or changed since the merge base with `ref`, including
 * uncommitted and untracked files, as paths relative to the repo root.
 */
export function changedQuestionFiles(root: string, ref: string): Set<string> {
  let base: string;
  try {
    base = git(root, ["merge-base", ref, "HEAD"]).trim();
  } catch {
    throw new Error(`--since ${ref}: no merge base with HEAD (fetch the base branch with full history)`);
  }
  const lines = [
    ...git(root, ["diff", "--relative", "--name-only", "--diff-filter=AMR", base, "--", "bank"]).split("\n"),
    ...git(root, ["ls-files", "--others", "--exclude-standard", "--", "bank"]).split("\n"),
  ];
  return new Set(lines.filter((l) => /\.ya?ml$/.test(l) && !l.startsWith("bank/_")));
}

export interface BankStats {
  questions: number;
  hardShare: number;
  keyOnlyLongestShare: number;
  giveawayShare: number;
  qualifierShare: number;
  sequencingShare: number;
  medianStemWords: number;
  optionsOnlyChecked: number;
  optionsOnlyObvious: number;
}

const share = (n: number, d: number) => (d === 0 ? 0 : n / d);

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** The key is strictly longer than every distractor. */
function keyOnlyLongest(q: Question): boolean {
  return keyLengthRatio(q) > 1;
}

export function bankStats(questions: Question[]): BankStats {
  const n = questions.length;
  const checked = questions.filter((q) => q.provenance.options_only !== undefined);
  return {
    questions: n,
    hardShare: share(questions.filter((q) => q.difficulty === "hard").length, n),
    keyOnlyLongestShare: share(questions.filter(keyOnlyLongest).length, n),
    giveawayShare: share(questions.filter((q) => giveawayCues(q).length > 0).length, n),
    qualifierShare: share(questions.filter((q) => QUALIFIER.test(q.stem)).length, n),
    sequencingShare: share(questions.filter((q) => SEQUENCING.test(q.stem)).length, n),
    medianStemWords: median(questions.map(stemWords)),
    optionsOnlyChecked: checked.length,
    optionsOnlyObvious: checked.filter((q) => q.provenance.options_only === "obvious").length,
  };
}

/** Targets for the new or changed published questions of a PR, per exam. */
export function checkChangedBatch(changed: Loaded<Question>[], profiles: Map<string, CalibrationProfile>): Issue[] {
  const issues: Issue[] = [];
  const byExam = new Map<string, Question[]>();
  for (const q of changed) {
    if (q.data.status !== "published") continue;
    const exam = q.data.id.split("-")[0]!;
    byExam.set(exam, [...(byExam.get(exam) ?? []), q.data]);
  }
  for (const [exam, qs] of byExam) {
    const profile = profiles.get(exam);
    if (!profile) continue;
    const file = `bank/${exam}/`;
    const s = bankStats(qs);
    const t = profile.targets;
    const obvious = share(s.optionsOnlyObvious, s.optionsOnlyChecked);
    if (s.optionsOnlyChecked > 0 && obvious > t.options_only_obvious_max) {
      issues.push({
        level: s.optionsOnlyChecked >= MIN_BATCH_FOR_RATE ? "error" : "warning",
        file,
        message: `${s.optionsOnlyObvious}/${s.optionsOnlyChecked} changed questions are obvious from the options alone (${pct(obvious)}), target at most ${pct(t.options_only_obvious_max)}; rewrite distractors`,
      });
    }
    if (s.hardShare < t.hard_share_min) {
      issues.push({
        level: "warning",
        file,
        message: `${pct(s.hardShare)} of changed questions are hard, profile asks for at least ${pct(t.hard_share_min)}; when unsure, make it harder`,
      });
    }
  }
  return issues;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Bank statistics against the profile's targets, for `pnpm calibration`. */
export function formatCalibration(recipe: Recipe, profile: CalibrationProfile | undefined, questions: Question[]): string {
  const live = questions.filter((q) => q.status === "published" && q.id.startsWith(`${recipe.exam.id}-`));
  const s = bankStats(live);
  const lines = [`${recipe.exam.name}: ${s.questions} published question(s)`];
  if (!profile) return [...lines, "  no calibration profile (recipes/<exam>/calibration.yaml)"].join("\n");
  const t = profile.targets;
  const row = (label: string, value: string, target: string, ok: boolean) =>
    lines.push(`  ${ok ? "ok  " : "MISS"} ${label.padEnd(34)} ${value.padStart(6)}   target ${target}`);
  const obvious = share(s.optionsOnlyObvious, s.optionsOnlyChecked);
  row(
    `options-only obvious (${s.optionsOnlyObvious}/${s.optionsOnlyChecked} recorded)`,
    s.optionsOnlyChecked ? pct(obvious) : "n/a",
    `<= ${pct(t.options_only_obvious_max)}`,
    obvious <= t.options_only_obvious_max,
  );
  row("hard", pct(s.hardShare), `>= ${pct(t.hard_share_min)}`, s.hardShare >= t.hard_share_min);
  row("key is the only longest option", pct(s.keyOnlyLongestShare), `<= ${pct(t.key_only_longest_max)}`, s.keyOnlyLongestShare <= t.key_only_longest_max);
  row(
    "median stem words",
    String(s.medianStemWords),
    `${t.stem_words.min}-${t.stem_words.max}`,
    s.medianStemWords >= t.stem_words.min && s.medianStemWords <= t.stem_words.max,
  );
  lines.push(`       ${"one-sided giveaway wording".padEnd(34)} ${pct(s.giveawayShare).padStart(6)}`);
  lines.push(`       ${"stem has a MOST/BEST/FIRST qualifier".padEnd(34)} ${pct(s.qualifierShare).padStart(6)}`);
  lines.push(`       ${"sequencing (FIRST/NEXT)".padEnd(34)} ${pct(s.sequencingShare).padStart(6)}`);
  return lines.join("\n");
}

const optionLines = (q: Question) => Object.entries(q.options).map(([k, v]) => `- ${k}. ${v}`);

/**
 * The two packets for the independent checker: options only (no stem, no key),
 * then stem and options (no key). The checker answers the first before opening the second.
 */
export function writeCheckerPackets(questions: Question[], out: string): { optionsOnly: string; full: string } {
  mkdirSync(out, { recursive: true });
  const optionsOnly = join(out, "1-options-only.md");
  const full = join(out, "2-full.md");
  const head = (title: string) => [`# ${title}`, "", `${questions.length} question(s). Answer in answers.yaml (docs/calibration/checker-brief.md).`, ""];
  writeFileSync(
    optionsOnly,
    [...head("Options only"), ...questions.flatMap((q) => [`## ${q.id}`, "", ...optionLines(q), ""])].join("\n"),
  );
  writeFileSync(
    full,
    [...head("Full questions (no key)"), ...questions.flatMap((q) => [`## ${q.id}`, "", q.stem, "", ...optionLines(q), ""])].join("\n"),
  );
  return { optionsOnly, full };
}

export interface OptionsOnlyAnswer {
  pick: string;
  sure: boolean;
}

/** "obvious" when the checker picked the key from the options alone and was sure. */
export const optionsOnlyVerdict = (q: Question, a: OptionsOnlyAnswer): "obvious" | "not_obvious" =>
  a.sure && a.pick === q.answer ? "obvious" : "not_obvious";

/** Sets provenance.options_only in a question file's text, keeping the rest of the file as written. */
export function setOptionsOnly(text: string, verdict: "obvious" | "not_obvious"): string {
  const without = text.replace(/^  options_only: .*\n?/m, "");
  const withField = without.replace(/^(  check_verdict: .*)$/m, `$1\n  options_only: ${verdict}`);
  if (withField === without) throw new Error("no provenance.check_verdict line to anchor options_only");
  return withField;
}
