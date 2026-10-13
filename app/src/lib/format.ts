// Display helpers. Kept apart from content.ts so client components can use them
// without bundling the question data.
import type { PublicExam } from "@cpe/tools/build";

export function formatQuestionCount(exam: PublicExam): string {
  const q = exam.format.questions;
  return typeof q === "number" ? `${q}` : `${q.min}–${q.max}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function percent(weight: number): string {
  return `${Math.round(weight * 100)}%`;
}
