"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";
import {
  BAND_LABEL,
  domainStats,
  emptyProgress,
  forgetExam,
  loadProgress,
  missedIds,
  readiness,
  saveProgress,
  type Progress,
} from "@/lib/progress";

export interface DomainSummary {
  id: string;
  name: string;
  /** e.g. "37%"; null while the issuer hasn't published weights (preview). */
  weight: string | null;
  questionIds: string[];
}

export interface TestSummary {
  questions: number;
  minutes: number;
}

export interface TimedTests {
  mock: TestSummary;
  quick: TestSummary;
  /** The real exam's pace, from the recipe's product.mock. */
  pace: TestSummary;
}

export function DomainList({
  examId,
  domains,
  free,
  target,
  tests,
}: {
  examId: string;
  domains: DomainSummary[];
  free: boolean;
  /** The recipe's min_accuracy_per_domain. */
  target: number;
  /** Null for a preview exam: no timed tests until the real format is known. */
  tests: TimedTests | null;
}) {
  // Progress lives in the browser, so it is read after hydration.
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  useEffect(() => setProgress(loadProgress()), []);

  const all = domains.flatMap((d) => d.questionIds);
  const overall = domainStats(all, progress);
  const missedAll = missedIds(all, progress).length;

  return (
    <>
      <div className="card summary">
        {overall.answered === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Pick a practice test or a domain to start. Your answers are saved in this browser, so you can stop and come back any time.
          </p>
        ) : (
          <>
            <div className="summary-stats">
              <div>
                <strong>
                  {overall.answered}/{overall.total}
                </strong>
                <span className="muted small">answered</span>
              </div>
              <div>
                <strong>{Math.round((overall.lastCorrect / overall.answered) * 100)}%</strong>
                <span className="muted small">right last time</span>
              </div>
              <div>
                <strong>{missedAll}</strong>
                <span className="muted small">to review</span>
              </div>
            </div>
            <p className="muted small" style={{ margin: "12px 0 0" }}>
              A domain is on track at {Math.round(target * 100)}% readiness. Readiness is your accuracy, held near 50%
              until you have answered enough questions to tell.
            </p>
          </>
        )}
      </div>

      {all.length > 0 && tests && (
        <>
          <h2>Practice tests</h2>
          <div className="test-grid">
            <Link className="card test-card" href={`/exams/${examId}/mock`}>
              <span className="name">Mock exam</span>
              <span className="muted small">
                {tests.mock.questions} questions · {formatDuration(tests.mock.minutes)} · timed, all domains
              </span>
            </Link>
            <Link className="card test-card" href={`/exams/${examId}/quick`}>
              <span className="name">Quick {tests.quick.questions}</span>
              <span className="muted small">
                {tests.quick.questions} random questions · {formatDuration(tests.quick.minutes)} · timed
              </span>
            </Link>
            {missedAll > 0 ? (
              <Link className="card test-card" href={`/exams/${examId}/missed`}>
                <span className="name">Wrong answers</span>
                <span className="muted small">
                  {missedAll} you got wrong last time ·{" "}
                  {formatDuration(Math.max(1, Math.round((tests.pace.minutes * missedAll) / tests.pace.questions)))} · timed
                </span>
              </Link>
            ) : (
              <div className="card test-card disabled" aria-disabled="true">
                <span className="name">Wrong answers</span>
                <span className="muted small">Questions you get wrong will appear here</span>
              </div>
            )}
          </div>
        </>
      )}
      {all.length > 0 && !tests && (
        <p className="muted small" style={{ marginTop: 24 }}>
          Timed mock exams arrive once the exam outline is published. Until then, practise by domain below.
        </p>
      )}

      <h2>Domains</h2>
      <div className="stack">
        {domains.map((d) => {
          const stats = domainStats(d.questionIds, progress);
          const r = readiness(stats, target);
          const missed = missedIds(d.questionIds, progress).length;
          return (
            <div className="card" key={d.id}>
              <div className="domain-row">
                <div>
                  <div className="name">{d.name}</div>
                  <div className="muted small">
                    {d.weight ? `${d.weight} of the exam · ` : ""}
                    {stats.total} {stats.total === 1 ? "question" : "questions"}
                    {stats.answered > 0 ? ` · ${stats.answered} answered` : ""}
                  </div>
                </div>
                {stats.answered > 0 && (
                  <span className={`band band-${r.band}`}>
                    {BAND_LABEL[r.band]} · {Math.round(r.score * 100)}%
                  </span>
                )}
              </div>
              {stats.total > 0 && (
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${Math.round(r.score * 100)}%` }} className={`fill-${r.band}`} />
                  <i style={{ left: `${Math.round(target * 100)}%` }} />
                </div>
              )}
              <div className="actions">
                {stats.total > 0 ? (
                  <>
                    <Link className="button" href={`/exams/${examId}/drill/${d.id}`}>
                      {stats.answered > 0 ? "Practise" : `Start ${stats.total}${free ? " free" : ""} questions`}
                    </Link>
                    {missed > 0 &&
                      (tests ? (
                        <Link className="button secondary" href={`/exams/${examId}/missed/${d.id}`}>
                          Review {missed} missed, timed
                        </Link>
                      ) : (
                        <Link className="button secondary" href={`/exams/${examId}/drill/${d.id}#missed`}>
                          Review {missed} missed
                        </Link>
                      ))}
                  </>
                ) : (
                  <span className="pill">Questions coming soon</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {overall.answered > 0 && (
        <p className="small" style={{ marginTop: 24 }}>
          <button
            className="link-button"
            onClick={() => {
              if (!window.confirm("Clear all your answers for this exam on this device?")) return;
              const next = forgetExam(loadProgress(), examId);
              saveProgress(next);
              setProgress(next);
            }}
          >
            Clear my progress for this exam
          </button>
        </p>
      )}
    </>
  );
}
