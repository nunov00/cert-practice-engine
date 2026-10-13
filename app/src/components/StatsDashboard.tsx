"use client";

import { useCallback, useEffect, useState } from "react";
import { finished, started, type Counts, type StatsReport } from "@/lib/stats";

const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 0, label: "All time" },
] as const;

type Names = Record<string, { name: string; domains: Record<string, string> }>;
type Report = StatsReport & { today: string; names: Names };

type State = { kind: "loading" } | { kind: "ready"; report: Report } | { kind: "error"; error: string };

export function StatsDashboard() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [days, setDays] = useState<number>(30);

  const load = useCallback(async (period: number) => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/stats?days=${period}`);
      const data = (await res.json()) as Report & { error?: string };
      if (res.ok) setState({ kind: "ready", report: data });
      else setState({ kind: "error", error: data.error ?? "Couldn't load the numbers." });
    } catch {
      setState({ kind: "error", error: "Couldn't reach the site. Check your connection." });
    }
  }, []);

  useEffect(() => {
    void load(30);
  }, [load]);

  const pick = (period: number) => {
    setDays(period);
    void load(period);
  };

  if (state.kind === "loading") return <p className="muted">Loading…</p>;
  if (state.kind === "error") return <p className="verdict bad">{state.error}</p>;

  const r = state.report;
  const examName = (id: string) => r.names[id]?.name ?? id;
  const domainName = (exam: string, id: string) => r.names[exam]?.domains[id] ?? id;
  const n = (c: Counts, e: keyof Counts) => c[e] ?? 0;
  const dayMax = Math.max(1, ...r.days.map((d) => started(d.counts) + n(d.counts, "exam_open")));

  return (
    <div className="stats">
      <div className="segmented" role="group" aria-label="Period">
        {PERIODS.map((p) => (
          <button key={p.days} aria-pressed={days === p.days} onClick={() => pick(p.days)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="stat-tiles">
        <div>
          <strong>{n(r.totals, "exam_open")}</strong>
          <span>Exam page opens</span>
        </div>
        <div>
          <strong>{started(r.totals)}</strong>
          <span>Practice sessions started</span>
        </div>
        <div>
          <strong>{finished(r.totals)}</strong>
          <span>Practice sessions finished</span>
        </div>
        <div>
          <strong>{n(r.totals, "mock_start")}</strong>
          <span>Mock exams started</span>
        </div>
      </div>

      <h2>Exams</h2>
      {r.exams.length === 0 ? (
        <p className="muted">Nothing counted in this period yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="stats-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Exam</th>
                <th>Opens</th>
                <th>Drills</th>
                <th>Quick 10</th>
                <th>Mocks</th>
                <th>Wrong answers</th>
                <th>Finished</th>
              </tr>
            </thead>
            <tbody>
              {r.exams.map((e, i) => (
                <tr key={e.exam}>
                  <td className="muted">{i + 1}</td>
                  <td>{examName(e.exam)}</td>
                  <td>{n(e.counts, "exam_open")}</td>
                  <td>{n(e.counts, "drill_start")}</td>
                  <td>{n(e.counts, "quick_start")}</td>
                  <td>{n(e.counts, "mock_start")}</td>
                  <td>{n(e.counts, "missed_start")}</td>
                  <td>{finished(e.counts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {r.domains.length > 0 && (
        <>
          <h2>Domains by practice</h2>
          <div className="table-wrap">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Domain</th>
                  <th>Started</th>
                  <th>Finished</th>
                </tr>
              </thead>
              <tbody>
                {r.domains.slice(0, 15).map((d, i) => (
                  <tr key={`${d.exam}/${d.domain}`}>
                    <td className="muted">{i + 1}</td>
                    <td>
                      {domainName(d.exam, d.domain)} <span className="muted small">· {examName(d.exam)}</span>
                    </td>
                    <td>{started(d.counts)}</td>
                    <td>{finished(d.counts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {r.days.length > 0 && (
        <>
          <h2>Daily activity</h2>
          <p className="muted small">Exam page opens plus practice sessions started, per day (UTC).</p>
          <ol className="day-bars">
            {r.days.slice(0, 30).map((d) => {
              const total = started(d.counts) + n(d.counts, "exam_open");
              return (
                <li key={d.day}>
                  <span>{d.day}</span>
                  <span className="bar" aria-hidden="true">
                    <span style={{ width: `${(total / dayMax) * 100}%` }} />
                  </span>
                  <strong>{total}</strong>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <p className="muted small" style={{ marginTop: 32 }}>
        Each browser counts an exam page, drill or test at most once a day, so these are not counts of unique people.
        Browsers that ask not to be tracked aren&apos;t counted. No cookies, IP addresses or visitor IDs are kept.
      </p>
    </div>
  );
}
