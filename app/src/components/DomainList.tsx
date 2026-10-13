"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  weight: string;
  questionIds: string[];
}

export function DomainList({
  examId,
  domains,
  free,
  target,
}: {
  examId: string;
  domains: DomainSummary[];
  free: boolean;
  /** The recipe's min_accuracy_per_domain. */
  target: number;
}) {
  // Progress lives in the browser, so it is read after hydration.
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  useEffect(() => setProgress(loadProgress()), []);

  const all = domains.flatMap((d) => d.questionIds);
  const overall = domainStats(all, progress);

  return (
    <>
      <div className="card summary">
        {overall.answered === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Pick a domain to start. Your answers are saved in this browser, so you can stop and come back any time.
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
                <strong>{missedIds(all, progress).length}</strong>
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
                    {d.weight} of the exam · {stats.total} {stats.total === 1 ? "question" : "questions"}
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
                    {missed > 0 && (
                      <Link className="button secondary" href={`/exams/${examId}/drill/${d.id}#missed`}>
                        Review {missed} missed
                      </Link>
                    )}
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
