"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { groupByTopic, issuers, searchCatalogue, type CatalogueEntry, type SearchHit } from "@/lib/catalogue";
import type { Topic } from "@/lib/content";
import { formatDuration } from "@/lib/format";
import { hideRecent, loadHiddenRecent, loadProgress, recentExams, visibleRecent, type HiddenRecent } from "@/lib/progress";

// Search state survives going into an exam and back, for this tab only.
const STATE_KEY = "cpe.catalogue.v1";
const SHOWN_DOMAINS = 3;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Catalogue({ entries, topics, free }: { entries: CatalogueEntry[]; topics: Topic[]; free: boolean }) {
  const [query, setQuery] = useState("");
  const [issuer, setIssuer] = useState("");
  const [recent, setRecent] = useState<{ entry: CatalogueEntry; answered: number }[]>([]);
  const [hidden, setHidden] = useState<HiddenRecent | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(STATE_KEY) ?? "{}") as { q?: string; issuer?: string };
      if (typeof saved.q === "string") setQuery(saved.q);
      if (typeof saved.issuer === "string" && entries.some((e) => e.issuer === saved.issuer)) setIssuer(saved.issuer);
    } catch {
      // Storage blocked: start with an empty search.
    }
    setHidden(loadHiddenRecent());
  }, [entries]);

  useEffect(() => {
    if (hidden === null) return;
    const byId = new Map(entries.map((e) => [e.id, e]));
    setRecent(
      visibleRecent(recentExams(loadProgress()), hidden)
        .filter((r) => byId.has(r.exam))
        .slice(0, 3)
        .map((r) => ({ entry: byId.get(r.exam)!, answered: r.answered })),
    );
  }, [entries, hidden]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STATE_KEY, JSON.stringify({ q: query, issuer }));
    } catch {
      // Not kept; nothing else depends on it.
    }
  }, [query, issuer]);

  const issuerList = useMemo(() => issuers(entries), [entries]);
  const hits = useMemo(() => searchCatalogue(entries, query, issuer), [entries, query, issuer]);
  const searching = query.trim() !== "";
  // A search lists hits by relevance; otherwise exams are grouped by subject area.
  const sections = useMemo(() => (searching ? [] : groupByTopic(hits, topics)), [searching, hits, topics]);
  const areas = useMemo(() => new Set(entries.map((e) => e.topic.id)).size, [entries]);

  return (
    <>
      {recent.length > 0 && (
        <section aria-labelledby="continue">
          <h2 id="continue">Continue</h2>
          <div className="continue-row">
            {recent.map(({ entry, answered }) => (
              <div key={entry.id} className="continue-item">
                <Link className="continue-card" href={`/exams/${entry.id}`}>
                  <span className="name">{entry.name}</span>
                  <span className="muted small">
                    {answered} of {entry.questions} answered
                  </span>
                </Link>
                <button
                  type="button"
                  className="continue-hide"
                  aria-label={`Remove ${entry.name} from Continue`}
                  title="Remove from Continue (your answers are kept)"
                  onClick={() => setHidden(hideRecent(entry.id))}
                >
                  ×
                </button>
              </div>
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
            placeholder="Search by exam name, acronym or topic"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>

        {issuerList.length > 1 && (
          <div className="chips" role="group" aria-label="Filter by issuer">
            <button type="button" className="chip" aria-pressed={issuer === ""} onClick={() => setIssuer("")}>
              All <span className="chip-count">{entries.length}</span>
            </button>
            {issuerList.map((i) => (
              <button
                key={i.name}
                type="button"
                className="chip"
                aria-pressed={issuer === i.name}
                onClick={() => setIssuer(issuer === i.name ? "" : i.name)}
              >
                {i.name} <span className="chip-count">{i.count}</span>
              </button>
            ))}
          </div>
        )}

        <p className="muted small results" aria-live="polite">
          {searching || issuer !== ""
            ? `${hits.length} of ${plural(entries.length, "exam", "exams")}`
            : `${plural(entries.length, "exam", "exams")} in ${plural(areas, "subject area", "subject areas")}`}
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
        ) : searching ? (
          <ExamGrid hits={hits} free={free} showTopic />
        ) : (
          sections.map(({ topic, hits }) => (
            <section key={topic.id} className="topic-section" aria-labelledby={`topic-${topic.id}`}>
              <h3 id={`topic-${topic.id}`}>
                {topic.label} <span className="topic-count">{hits.length}</span>
              </h3>
              <ExamGrid hits={hits} free={free} />
            </section>
          ))
        )}
      </section>
    </>
  );
}

function ExamGrid({ hits, free, showTopic = false }: { hits: SearchHit[]; free: boolean; showTopic?: boolean }) {
  return (
    <ul className="exam-grid">
      {hits.map(({ entry, domain }) => (
        <li key={entry.id}>
          <Link className="exam-card" href={`/exams/${entry.id}`}>
            <span className="exam-card-head">
              <span className="name">{entry.name}</span>
              <span className="pill">{entry.issuer}</span>
              {entry.preview && <span className="pill">Preview</span>}
            </span>
            {showTopic && <span className="small exam-card-topic">{entry.topic.label}</span>}
            <span className="muted small">
              {entry.domains.length} domains ·{" "}
              {entry.examQuestions === null ? "outline not yet published" : `${entry.examQuestions} questions`} ·{" "}
              {formatDuration(entry.minutes)}
            </span>
            {domain ? (
              <span className="small topics">Covers: {domain}</span>
            ) : (
              <span className="small topics muted">
                {entry.domains.slice(0, SHOWN_DOMAINS).join(" · ")}
                {entry.domains.length > SHOWN_DOMAINS ? ` · +${entry.domains.length - SHOWN_DOMAINS} more` : ""}
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
  );
}
