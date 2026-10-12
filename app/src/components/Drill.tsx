"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PublicQuestion } from "@/lib/content";
import { drillOrder, loadProgress, recordAttempt, saveProgress } from "@/lib/progress";

type Phase = "loading" | "answering" | "revealed" | "done";

export function Drill({ examId, questions }: { examId: string; questions: PublicQuestion[] }) {
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const [order, setOrder] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [results, setResults] = useState<Record<string, boolean>>({});

  const start = (ids: string[]) => {
    setOrder(drillOrder(ids, loadProgress()));
    setIndex(0);
    setChoice(null);
    setResults({});
    setPhase("answering");
  };

  useEffect(() => start(questions.map((q) => q.id)), [questions]);

  if (phase === "loading") return <p className="muted">Loading…</p>;

  if (phase === "done") {
    const ids = Object.keys(results);
    const right = ids.filter((id) => results[id]).length;
    const missed = ids.filter((id) => !results[id]);
    return (
      <div className="card">
        <p className="verdict">
          You got {right} of {ids.length} right.
        </p>
        <p className="muted">
          {missed.length === 0
            ? "Nothing to review in this set."
            : "Missed questions come first next time you drill this domain."}
        </p>
        <div className="actions">
          {missed.length > 0 && (
            <button className="button" onClick={() => start(missed)}>
              Retry the {missed.length} missed
            </button>
          )}
          <button className="button secondary" onClick={() => start(questions.map((q) => q.id))}>
            Drill all again
          </button>
          <Link className="button secondary" href={`/exams/${examId}`}>
            Back to domains
          </Link>
        </div>
      </div>
    );
  }

  const q = byId.get(order[index]!)!;
  const letters = Object.keys(q.options).sort();
  const revealed = phase === "revealed";
  const isRight = choice === q.answer;

  const check = () => {
    if (!choice) return;
    const correct = choice === q.answer;
    saveProgress(recordAttempt(loadProgress(), q.id, correct));
    setResults((r) => ({ ...r, [q.id]: correct }));
    setPhase("revealed");
  };

  const next = () => {
    if (index + 1 >= order.length) {
      setPhase("done");
      return;
    }
    setIndex(index + 1);
    setChoice(null);
    setPhase("answering");
  };

  return (
    <div className="card">
      <p className="muted small">
        Question {index + 1} of {order.length} <span className="pill">{q.difficulty}</span>
      </p>
      <p style={{ whiteSpace: "pre-line" }}>{q.stem}</p>

      <ul className="options">
        {letters.map((l) => {
          const state = !revealed ? "" : l === q.answer ? "correct" : l === choice ? "wrong" : "";
          return (
            <li key={l}>
              <button
                type="button"
                className={`option ${state}`}
                aria-pressed={choice === l}
                disabled={revealed}
                onClick={() => setChoice(l)}
              >
                <span className="letter">{l}</span>
                <span>
                  {q.options[l]}
                  {revealed && (
                    <span className="why" style={{ display: "block" }}>
                      {l === q.answer ? q.explanation.why_correct : q.explanation.why_not[l]}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {revealed && (
        <p className={`verdict ${isRight ? "good" : "bad"}`} role="status">
          {isRight ? "Correct." : `Not quite. The best answer is ${q.answer}.`}
        </p>
      )}

      <div className="actions">
        {!revealed ? (
          <button className="button" onClick={check} disabled={!choice}>
            Check answer
          </button>
        ) : (
          <button className="button" onClick={next} autoFocus>
            {index + 1 >= order.length ? "See results" : "Next question"}
          </button>
        )}
      </div>
    </div>
  );
}
