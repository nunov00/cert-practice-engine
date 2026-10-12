import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "yaml";

export interface Loaded<T> {
  file: string; // path relative to the repo root
  data: T;
}

export interface LoadError {
  file: string;
  message: string;
}

function readYaml(root: string, path: string): Loaded<unknown> | LoadError {
  const file = relative(root, path);
  try {
    return { file, data: parse(readFileSync(path, "utf8")) };
  } catch (err) {
    return { file, message: `YAML parse error: ${(err as Error).message}` };
  }
}

function walkYaml(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith("_") || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walkYaml(path));
    else if (name.endsWith(".yaml") || name.endsWith(".yml")) out.push(path);
  }
  return out;
}

/** recipes/<exam>/recipe.yaml, skipping _format and _schema. */
export function loadRecipes(root: string) {
  const dir = join(root, "recipes");
  const results: (Loaded<unknown> | LoadError)[] = [];
  if (!existsSync(dir)) return results;
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith("_") || name.startsWith(".")) continue;
    const path = join(dir, name, "recipe.yaml");
    if (existsSync(path)) results.push(readYaml(root, path));
  }
  return results;
}

/** Every question file under bank/, skipping _schema. */
export function loadQuestions(root: string) {
  return walkYaml(join(root, "bank")).map((p) => readYaml(root, p));
}

export function isLoadError(x: Loaded<unknown> | LoadError): x is LoadError {
  return "message" in x;
}
