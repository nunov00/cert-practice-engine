import type { Loaded } from "./load.ts";
import type { Question, Recipe } from "./types.ts";

export interface CoverageRow {
  domain: string;
  subdomain: string;
  title: string;
  target: number;
  published: number;
  pending: number; // draft + in_review
  gap: number; // target - published, never negative
}

/** Published and pending counts per subdomain against recipe targets. */
export function coverage(recipe: Recipe, questions: Loaded<Question>[]): CoverageRow[] {
  const prefix = `${recipe.exam.id}-`;
  const mine = questions.filter((q) => q.data.id.startsWith(prefix));
  return recipe.domains.flatMap((d) =>
    d.subdomains.map((s) => {
      const here = mine.filter((q) => q.data.subdomain === s.id);
      const published = here.filter((q) => q.data.status === "published").length;
      const pending = here.filter((q) => q.data.status === "draft" || q.data.status === "in_review").length;
      return {
        domain: d.id,
        subdomain: s.id,
        title: s.title,
        target: s.target_questions,
        published,
        pending,
        gap: Math.max(0, s.target_questions - published),
      };
    }),
  );
}

export function formatCoverage(recipe: Recipe, rows: CoverageRow[]): string {
  const lines = [`${recipe.exam.name} (outline ${recipe.exam.outline.version})`, ""];
  lines.push("subdomain  target  published  pending  gap");
  for (const r of rows) {
    lines.push(
      `${r.subdomain.padEnd(9)}  ${String(r.target).padStart(6)}  ${String(r.published).padStart(9)}  ${String(r.pending).padStart(7)}  ${String(r.gap).padStart(3)}`,
    );
  }
  const t = rows.reduce((a, r) => ({ target: a.target + r.target, published: a.published + r.published, gap: a.gap + r.gap }), {
    target: 0,
    published: 0,
    gap: 0,
  });
  lines.push("", `total: ${t.published}/${t.target} published, ${t.gap} to go`);
  return lines.join("\n");
}
