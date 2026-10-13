import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { isPreview, validateRepo } from "./validate.ts";
import type { Question, Recipe } from "./types.ts";

/**
 * What the public site ships to browsers (decision 0004):
 * - "open": every published question. Used until monetisation (roadmap phase 8);
 *   anything shipped in this mode should be treated as public for good.
 * - "free-sample": only published questions marked `sample: true`. Switch to this
 *   when paid unlocks exist; paid questions are then served by the backend
 *   behind an entitlement check, never bundled.
 * Drafts, in-review and retired questions are never shipped in either mode.
 */
export type PublicAccess = "open" | "free-sample";
export const PUBLIC_ACCESS: PublicAccess = "open";

export interface PublicExam {
  id: string;
  name: string;
  issuer: string;
  disclaimer: string;
  outline_version: string;
  /** No published outline yet: weights, length, scoring and mock are null or absent; drills only. */
  preview: boolean;
  format: Recipe["format"];
  domains: { id: string; name: string; weight: number | null; subdomains: { id: string; title: string }[] }[];
  free_sample_per_domain: number;
  unlock: Recipe["product"]["unlock"];
  mock: NonNullable<Recipe["product"]["mock"]> | null;
  /** Preview only: estimated pace for the Quick 10, shown as an estimate. */
  estimated_pace: NonNullable<Recipe["product"]["estimated_pace"]> | null;
  readiness: Recipe["product"]["readiness"];
  published_questions: number;
}

export type PublicQuestion = Omit<Question, "status" | "sample" | "provenance"> & {
  exam: string;
  domain: string;
};

export interface PublicContent {
  access: PublicAccess;
  exams: PublicExam[];
  questions: PublicQuestion[];
}

export function buildPublicContent(root: string, access: PublicAccess = PUBLIC_ACCESS): PublicContent {
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
      preview: isPreview(r),
      format: r.format,
      domains: r.domains.map((d) => ({
        id: d.id,
        name: d.name,
        weight: d.weight ?? null,
        subdomains: d.subdomains.map((s) => ({ id: s.id, title: s.title })),
      })),
      free_sample_per_domain: r.product.free_sample_per_domain,
      unlock: r.product.unlock,
      mock: r.product.mock ?? null,
      estimated_pace: r.product.estimated_pace ?? null,
      readiness: r.product.readiness,
      published_questions: published.filter((q) => q.id.startsWith(`${r.exam.id}-`)).length,
    }));

  const shipped: PublicQuestion[] = published
    .filter((q) => access === "open" || q.sample)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    .map(({ status: _status, sample: _sample, provenance: _provenance, ...rest }) => {
      const [exam, domain] = rest.id.split("-");
      return { ...rest, exam: exam!, domain: domain! };
    });

  return { access, exams, questions: shipped };
}

export function writePublicContent(root: string, outFile: string): PublicContent {
  const content = buildPublicContent(root);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(content, null, 2) + "\n");
  return content;
}
