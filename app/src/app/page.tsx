import Link from "next/link";
import { formatDuration, formatQuestionCount, listExams, sampleQuestions } from "@/lib/content";

export default function Home() {
  const exams = listExams();
  return (
    <>
      <h1>Practise for your certification exam</h1>
      <p className="lead">
        Original multiple-choice questions with an explanation for every option. Drill each domain, find your weak
        spots, and see when you look ready.
      </p>
      <div className="stack">
        {exams.map((exam) => {
          const free = sampleQuestions(exam.id).length;
          return (
            <div className="card" key={exam.id}>
              <div className="domain-row">
                <div>
                  <div className="name">{exam.name}</div>
                  <div className="muted small">
                    {exam.issuer} · {exam.domains.length} domains · {formatQuestionCount(exam)} questions ·{" "}
                    {formatDuration(exam.format.duration_minutes)}
                  </div>
                </div>
                {free > 0 ? (
                  <Link className="button" href={`/exams/${exam.id}`}>
                    Try {free} free questions
                  </Link>
                ) : (
                  <span className="pill">Coming soon</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
