import Link from "next/link";
import { TimedTest } from "@/components/TimedTest";
import { questionsFor, type PublicExam } from "@/lib/content";
import type { TestKind } from "@/lib/exam-session";

export const QUICK_SIZE = 10;

/** Timed tests need the real exam's pace, so preview exams (no outline yet) have none. */
export function hasTimedTests(exam: PublicExam): exam is PublicExam & { mock: NonNullable<PublicExam["mock"]> } {
  return exam.mock !== null && questionsFor(exam.id).length > 0;
}

/** The pace that times the Quick 10: the real one, or a preview exam's owner-approved estimate. */
export function quickPace(exam: PublicExam): { questions: number; minutes: number } | null {
  if (questionsFor(exam.id).length === 0) return null;
  return exam.mock ?? exam.estimated_pace;
}

/** Server wrapper shared by the mock exam and quick test pages. */
/** `domainId` limits a wrong-answers test to one domain. */
export function TestPage({ exam, kind, domainId }: { exam: PublicExam; kind: TestKind; domainId?: string }) {
  const questions = questionsFor(exam.id, domainId);
  const domain = exam.domains.find((d) => d.id === domainId);
  const pace = kind === "quick" ? quickPace(exam) : exam.mock;
  if (!pace) throw new Error(`no pace for a ${kind} test of ${exam.id}`);
  const size = kind === "mock" ? pace.questions : QUICK_SIZE;
  return (
    <>
      <nav className="crumbs small" aria-label="Breadcrumb">
        <Link href="/">Exams</Link> <span aria-hidden="true">/</span> <Link href={`/exams/${exam.id}`}>{exam.name}</Link>
      </nav>
      <h1>{kind === "mock" ? "Mock exam" : kind === "missed" ? "Wrong answers" : `Quick ${Math.min(size, questions.length)}`}</h1>
      <p className="lead">
        {exam.name} · timed, {domain ? domain.name : "all domains"}
        {kind === "missed" && (
          <>
            {" · "}
            <Link href={domain ? `/exams/${exam.id}/drill/${domain.id}#missed` : `/exams/${exam.id}/review#missed`}>
              practise untimed instead
            </Link>
          </>
        )}
      </p>
      <TimedTest
        examId={exam.id}
        kind={kind}
        size={size}
        pace={pace}
        estimate={exam.mock ? undefined : exam.estimated_pace?.basis}
        domains={(domain ? [domain] : exam.domains).map((d) => ({ id: d.id, name: d.name, weight: d.weight ?? 0 }))}
        questions={questions}
        target={exam.readiness.min_accuracy_per_domain}
        domainId={domain?.id}
      />
    </>
  );
}
