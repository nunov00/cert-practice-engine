// Public content compiled from recipes/ and bank/ by `pnpm content`
// (tools/src/build.ts). Which published questions are included depends on the
// access mode there (decision 0004); drafts are never included.
import type { PublicContent, PublicExam, PublicQuestion } from "@cpe/tools/build";
import raw from "../generated/content.json";

export type { PublicExam, PublicQuestion };

const content = raw as unknown as PublicContent;

export function listExams(): PublicExam[] {
  return content.exams;
}

export function getExam(id: string): PublicExam | undefined {
  return content.exams.find((e) => e.id === id);
}

export function isOpenAccess(): boolean {
  return content.access === "open";
}

export function questionsFor(examId: string, domainId?: string): PublicQuestion[] {
  return content.questions.filter((q) => q.exam === examId && (domainId === undefined || q.domain === domainId));
}

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
