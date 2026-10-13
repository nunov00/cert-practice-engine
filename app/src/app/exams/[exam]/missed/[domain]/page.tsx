import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasTimedTests, TestPage } from "@/components/TestPage";
import { getExam, listExams, questionsFor } from "@/lib/content";

type Params = { exam: string; domain: string };

export function generateStaticParams(): Params[] {
  return listExams().filter(hasTimedTests).flatMap((e) =>
    e.domains.filter((d) => questionsFor(e.id, d.id).length > 0).map((d) => ({ exam: e.id, domain: d.id })),
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { exam: examId, domain: domainId } = await params;
  const domain = getExam(examId)?.domains.find((d) => d.id === domainId);
  return { title: domain ? `${domain.name} wrong answers test` : "Wrong answers test" };
}

export default async function DomainMissedPage({ params }: { params: Promise<Params> }) {
  const { exam: examId, domain: domainId } = await params;
  const exam = getExam(examId);
  if (!exam || !hasTimedTests(exam)) notFound();
  if (!exam.domains.some((d) => d.id === domainId) || questionsFor(examId, domainId).length === 0) notFound();
  return <TestPage exam={exam} kind="missed" domainId={domainId} />;
}
