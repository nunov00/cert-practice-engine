import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Drill } from "@/components/Drill";
import { getExam, listExams, questionsFor } from "@/lib/content";

type Params = { exam: string };

export function generateStaticParams(): Params[] {
  return listExams()
    .filter((e) => questionsFor(e.id).length > 0)
    .map((e) => ({ exam: e.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const exam = getExam((await params).exam);
  return { title: exam ? `${exam.name} practice, all domains` : "Practice" };
}

export default async function ReviewPage({ params }: { params: Promise<Params> }) {
  const exam = getExam((await params).exam);
  const questions = exam ? questionsFor(exam.id) : [];
  if (!exam || questions.length === 0) notFound();

  return (
    <>
      <nav className="crumbs small" aria-label="Breadcrumb">
        <Link href="/">Exams</Link> <span aria-hidden="true">/</span> <Link href={`/exams/${exam.id}`}>{exam.name}</Link>
      </nav>
      <h1>All domains</h1>
      <p className="lead">
        {exam.name} · untimed practice with answers after each question · {questions.length} questions
      </p>
      <Drill examId={exam.id} questions={questions} />
    </>
  );
}
