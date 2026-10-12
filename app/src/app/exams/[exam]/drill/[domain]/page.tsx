import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Drill } from "@/components/Drill";
import { getExam, isOpenAccess, listExams, questionsFor } from "@/lib/content";

type Params = { exam: string; domain: string };

export function generateStaticParams(): Params[] {
  return listExams().flatMap((e) =>
    e.domains.filter((d) => questionsFor(e.id, d.id).length > 0).map((d) => ({ exam: e.id, domain: d.id })),
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { exam: examId, domain: domainId } = await params;
  const domain = getExam(examId)?.domains.find((d) => d.id === domainId);
  return { title: domain ? `${domain.name} drill` : "Drill" };
}

export default async function DrillPage({ params }: { params: Promise<Params> }) {
  const { exam: examId, domain: domainId } = await params;
  const exam = getExam(examId);
  const domain = exam?.domains.find((d) => d.id === domainId);
  const questions = questionsFor(examId, domainId);
  if (!exam || !domain || questions.length === 0) notFound();

  return (
    <>
      <p className="small">
        <Link href={`/exams/${exam.id}`}>← {exam.name}</Link>
      </p>
      <h1>{domain.name}</h1>
      <p className="lead">
        {isOpenAccess() ? "Drill" : "Free drill"} · {questions.length} questions
      </p>
      <Drill examId={exam.id} questions={questions} />
    </>
  );
}
