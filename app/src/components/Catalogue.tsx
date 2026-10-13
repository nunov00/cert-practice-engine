"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { issuers, searchCatalogue, type CatalogueEntry } from "@/lib/catalogue";
import { formatDuration } from "@/lib/format";
import { loadProgress, recentExams } from "@/lib/progress";

// Search state survives going into an exam and back, for this tab only.
const STATE_KEY = "cpe.catalogue.v1";
const SHOWN_TOPICS = 3;

export function Catalogue({ entries, free }: { entries: CatalogueEntry[]; free: boolean }) {
  const [query, setQuery] = useState("");
  const [issuer, setIssuer] = useState("");
  const [recent, setRecent] = useState<{ entry: CatalogueEntry; answered: number }[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(STATE_KEY) ?? "{}") as { q?: string; issuer?: string };
      if (typeof saved.q === "string") setQuery(saved.q);
      if (typeof saved.issuer === "string" && entries.some((e) => e.issuer === saved.issuer)) setIssuer(saved.issuer);
    } catch {
      // Storage blocked: start with an empty search.
    }
    const byId = new Map(entries.map((e) => [e.id, e]));
    setRecent(
      recentExams(loadProgress())
        .filter((r) => byId.has(r.exam))
        .slice(0, 3)
        .map((r) => ({ entry: byId.get(r.exam)!, answered: r.answered })),
    );
  }, [entries]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STATE_KEY, JSON.stringify({ q: query, issuer }));
    } catch {
      // Not kept; nothing else depends on it.
    }
  }, [query, issuer]);

  const issuerList = useMemo(() => issuers(entries), [entries]);
  const hits = useMemo(() => searchCatalogue(entries, query, issuer), [entries, query, issuer]);
  const filtered = query.trim() !== "" || issuer !== "";

  return (
    <>
      {recent.length > 0 && (
        <section aria-labelledby="continue">
          <h2 id="continue">Continue</h2>
          <div className="continue-row">
            {recent.map(({ entry, answered }) => (
              <Link key={entry.id} className="continue-card" href={`/exams/${entry.id}`}>
                <span className="name">{entry.name}</span>
                <span className="muted small">
                  {answered} of {entry.questions} answered
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="all-exams">
        <h2 id="all-exams">All exams</h2>
        <div className="search" role="search">
          <label className="visually-hidden" htmlFor="exam-search">
            Search exams
          </label>
          <input
            id="exam-search"
            type="search"
            placeholder="Search by exam, issuer or topic"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          <label className="visually-hidden" htmlFor="issuer-filter">
            Issuer
          </label>
          <select id="issuer-filter" value={issuer} onChange={(e) => setIssuer(e.target.value)}>
            <option value="">All issuers</option>
            {issuerList.map((i) => (
              <option key={i.name} value={i.name}>
                {i.name} ({i.count})
              </option>
            ))}
          </select>
        </div>

        <p className="muted small results" aria-live="polite">
          {filtered
            ? `${hits.length} of ${entries.length} exams`
            : `${entries.length} ${entries.length === 1 ? "exam" : "exams"}`}
        </p>

        {hits.length === 0 ? (
          <div className="card empty">
            <p>No exams match your search.</p>
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setIssuer("");
              }}
            >
              Clear search
            </button>
          </div>
        ) : (
          <ul className="exam-grid">
            {hits.map(({ entry, topic }) => (
              <li key={entry.id}>
                <Link className="exam-card" href={`/exams/${entry.id}`}>
                  <span className="exam-card-head">
                    <span className="name">{entry.name}</span>
                    <span className="pill">{entry.issuer}</span>
                    {entry.preview && <span className="pill">Preview</span>}
                  </span>
                  <span className="muted small">
                    {entry.topics.length} domains ·{" "}
                    {entry.examQuestions === null ? "outline not yet published" : `${entry.examQuestions} questions`} ·{" "}
                    {formatDuration(entry.minutes)}
                  </span>
                  {topic ? (
                    <span className="small topics">Covers: {topic}</span>
                  ) : (
                    <span className="small topics muted">
                      {entry.topics.slice(0, SHOWN_TOPICS).join(" · ")}
                      {entry.topics.length > SHOWN_TOPICS ? ` · +${entry.topics.length - SHOWN_TOPICS} more` : ""}
                    </span>
                  )}
                  <span className={entry.questions > 0 ? "exam-card-cta" : "exam-card-cta soon"}>
                    {entry.questions > 0
                      ? `${free ? "Try" : "Practise"} ${entry.questions} ${free ? "free " : ""}questions →`
                      : "Coming soon"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
