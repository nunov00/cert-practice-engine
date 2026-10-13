// Display helpers. Kept apart from content.ts so client components can use them
// without bundling the question data.
import type { PublicExam } from "@cpe/tools/build";

/** The real exam's length, or null when the issuer hasn't published it (preview). */
export function formatQuestionCount(exam: PublicExam): string | null {
  const q = exam.format.questions;
  if (q === undefined) return null;
  return typeof q === "number" ? `${q}` : `${q.min}–${q.max}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** The domain's weight, or null when the issuer hasn't published weights (preview). */
export function percent(weight: number): string;
export function percent(weight: number | null): string | null;
export function percent(weight: number | null): string | null {
  if (weight === null) return null;
  return `${Math.round(weight * 100)}%`;
}
