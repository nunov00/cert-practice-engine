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

export { formatDuration, formatQuestionCount, percent } from "./format";
