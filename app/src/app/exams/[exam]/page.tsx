import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DomainList } from "@/components/DomainList";
import { QUICK_SIZE } from "@/components/TestPage";
import { timeLimitSeconds } from "@/lib/exam-session";
import { formatDuration, formatQuestionCount, getExam, isOpenAccess, listExams, percent, questionsFor } from "@/lib/content";

type Params = { exam: string };

export function generateStaticParams(): Params[] {
  return listExams().map((e) => ({ exam: e.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const exam = getExam((await params).exam);
  return { title: exam ? `${exam.name} practice questions` : "Exam" };
}

export default async function ExamPage({ params }: { params: Promise<Params> }) {
  const exam = getExam((await params).exam);
  if (!exam) notFound();

  const domains = exam.domains.map((d) => ({
    id: d.id,
    name: d.name,
    weight: percent(d.weight),
    questionIds: questionsFor(exam.id, d.id).map((q) => q.id),
  }));

  const total = questionsFor(exam.id).length;
  const mockCount = Math.min(exam.mock.questions, total);
  const quickCount = Math.min(QUICK_SIZE, total);
  const minutes = (n: number) => Math.max(1, Math.round(timeLimitSeconds(n, exam.mock) / 60));

  return (
    <>
      <nav className="crumbs small" aria-label="Breadcrumb">
        <Link href="/">Exams</Link> <span aria-hidden="true">/</span> {exam.issuer}
      </nav>
      <h1>
        {exam.name} practice <span className="pill">{exam.issuer}</span>
      </h1>
      <p className="lead">
        {isOpenAccess()
          ? `${exam.published_questions} questions so far, more added regularly`
          : `Free sample: up to ${exam.free_sample_per_domain} questions per domain`}
        , written against the {exam.issuer} exam outline effective {exam.outline_version}.
      </p>

      <dl className="facts">
        <div>
          <dt>Questions</dt>
          <dd>{formatQuestionCount(exam)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatDuration(exam.format.duration_minutes)}</dd>
        </div>
        <div>
          <dt>Format</dt>
          <dd>{exam.format.delivery === "adaptive" ? "Adaptive" : "Linear"}</dd>
        </div>
        <div>
          <dt>Pass mark</dt>
          <dd>
            {exam.format.scoring.pass} / {exam.format.scoring.scale[1]}
          </dd>
        </div>
      </dl>

      <h2>Your progress</h2>
      <DomainList
        examId={exam.id}
        domains={domains}
        free={!isOpenAccess()}
        target={exam.readiness.min_accuracy_per_domain}
        mock={{ questions: mockCount, minutes: minutes(mockCount) }}
        quick={{ questions: quickCount, minutes: minutes(quickCount) }}
        pace={{ questions: exam.mock.questions, minutes: exam.mock.minutes }}
      />

      <p className="muted small" style={{ marginTop: 32 }}>
        {exam.disclaimer}
      </p>
    </>
  );
}
