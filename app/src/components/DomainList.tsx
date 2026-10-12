"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { domainStats, emptyProgress, loadProgress, type Progress } from "@/lib/progress";

export interface DomainSummary {
  id: string;
  name: string;
  weight: string;
  questionIds: string[];
}

export function DomainList({ examId, domains }: { examId: string; domains: DomainSummary[] }) {
  // Progress lives in the browser, so it is read after hydration.
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  useEffect(() => setProgress(loadProgress()), []);

  return (
    <div className="stack">
      {domains.map((d) => {
        const stats = domainStats(d.questionIds, progress);
        const done = stats.total > 0 ? stats.answered / stats.total : 0;
        return (
          <div className="card" key={d.id}>
            <div className="domain-row">
              <div>
                <div className="name">{d.name}</div>
                <div className="muted small">
                  {d.weight} of the exam
                  {stats.total > 0 && stats.answered > 0
                    ? ` · ${stats.answered}/${stats.total} answered · ${stats.lastCorrect} right last time`
                    : ""}
                </div>
              </div>
              {stats.total > 0 ? (
                <Link className="button" href={`/exams/${examId}/drill/${d.id}`}>
                  {stats.answered > 0 ? "Drill again" : `Start ${stats.total} free questions`}
                </Link>
              ) : (
                <span className="pill">Coming soon</span>
              )}
            </div>
            {stats.total > 0 && (
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${Math.round(done * 100)}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
