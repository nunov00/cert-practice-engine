import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { validateRepo } from "./validate.ts";
import type { Question, Recipe } from "./types.ts";

/**
 * The content the public site may ship to browsers: exam facts from each
 * recipe plus the published free-sample questions. Paid questions are never
 * included here; they will be served by the backend behind an entitlement check.
 */
export interface PublicExam {
  id: string;
  name: string;
  issuer: string;
  disclaimer: string;
  outline_version: string;
  format: Recipe["format"];
  domains: { id: string; name: string; weight: number; subdomains: { id: string; title: string }[] }[];
  free_sample_per_domain: number;
  unlock: Recipe["product"]["unlock"];
  mock: Recipe["product"]["mock"];
  published_questions: number;
}

export type PublicQuestion = Omit<Question, "status" | "sample" | "provenance"> & {
  exam: string;
  domain: string;
};

export interface PublicContent {
  exams: PublicExam[];
  questions: PublicQuestion[];
}

export function buildPublicContent(root: string): PublicContent {
  const { issues, recipes, questions } = validateRepo(root);
  const errors = issues.filter((i) => i.level === "error");
  if (errors.length > 0) {
    throw new Error(`content has ${errors.length} validation error(s); run pnpm validate`);
  }

  const published = questions.map((q) => q.data).filter((q) => q.status === "published");
  const exams: PublicExam[] = [...recipes.values()]
    .sort((a, b) => a.exam.id.localeCompare(b.exam.id))
    .map((r) => ({
      id: r.exam.id,
      name: r.exam.name,
      issuer: r.exam.issuer,
      disclaimer: r.exam.disclaimer,
      outline_version: r.exam.outline.version,
      format: r.format,
      domains: r.domains.map((d) => ({
        id: d.id,
        name: d.name,
        weight: d.weight,
        subdomains: d.subdomains.map((s) => ({ id: s.id, title: s.title })),
      })),
      free_sample_per_domain: r.product.free_sample_per_domain,
      unlock: r.product.unlock,
      mock: r.product.mock,
      published_questions: published.filter((q) => q.id.startsWith(`${r.exam.id}-`)).length,
    }));

  const sample: PublicQuestion[] = published
    .filter((q) => q.sample)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    .map(({ status: _status, sample: _sample, provenance: _provenance, ...rest }) => {
      const [exam, domain] = rest.id.split("-");
      return { ...rest, exam: exam!, domain: domain! };
    });

  return { exams, questions: sample };
}

export function writePublicContent(root: string, outFile: string): PublicContent {
  const content = buildPublicContent(root);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(content, null, 2) + "\n");
  return content;
}
