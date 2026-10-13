import Link from "next/link";
import { TimedTest } from "@/components/TimedTest";
import { questionsFor, type PublicExam } from "@/lib/content";
import type { TestKind } from "@/lib/exam-session";

export const QUICK_SIZE = 10;

/** Server wrapper shared by the mock exam and quick test pages. */
export function TestPage({ exam, kind }: { exam: PublicExam; kind: TestKind }) {
  const questions = questionsFor(exam.id);
  const size = kind === "mock" ? exam.mock.questions : QUICK_SIZE;
  return (
    <>
      <nav className="crumbs small" aria-label="Breadcrumb">
        <Link href="/">Exams</Link> <span aria-hidden="true">/</span> <Link href={`/exams/${exam.id}`}>{exam.name}</Link>
      </nav>
      <h1>{kind === "mock" ? "Mock exam" : `Quick ${Math.min(size, questions.length)}`}</h1>
      <p className="lead">{exam.name} · timed, all domains</p>
      <TimedTest
        examId={exam.id}
        kind={kind}
        size={size}
        pace={exam.mock}
        domains={exam.domains.map((d) => ({ id: d.id, name: d.name, weight: d.weight }))}
        questions={questions}
        target={exam.readiness.min_accuracy_per_domain}
      />
    </>
  );
}
