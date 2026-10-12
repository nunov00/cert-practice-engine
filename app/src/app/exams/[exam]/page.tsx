import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DomainList } from "@/components/DomainList";
import { formatDuration, formatQuestionCount, getExam, listExams, percent, sampleQuestions } from "@/lib/content";

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
    questionIds: sampleQuestions(exam.id, d.id).map((q) => q.id),
  }));

  return (
    <>
      <h1>{exam.name} practice</h1>
      <p className="lead">
        Free sample: up to {exam.free_sample_per_domain} questions per domain, written against the {exam.issuer} exam
        outline effective {exam.outline_version}.
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

      <h2>Domains</h2>
      <DomainList examId={exam.id} domains={domains} />

      <p className="muted small" style={{ marginTop: 32 }}>
        {exam.disclaimer}
      </p>
    </>
  );
}
