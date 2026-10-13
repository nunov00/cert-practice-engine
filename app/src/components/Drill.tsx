"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicQuestion } from "@/lib/content";
import { drillOrder, loadProgress, missedIds, recordAttempt, saveProgress } from "@/lib/progress";

type Phase = "loading" | "answering" | "revealed" | "done";
type Mode = "all" | "quick" | "missed";

const QUICK = 10;

interface Answer {
  choice: string;
  correct: boolean;
}

export function Drill({ examId, questions }: { examId: string; questions: PublicQuestion[] }) {
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const allIds = useMemo(() => questions.map((q) => q.id), [questions]);
  const [mode, setMode] = useState<Mode>("all");
  const [missedCount, setMissedCount] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const topRef = useRef<HTMLDivElement>(null);

  const start = useCallback(
    (next: Mode, ids?: string[]) => {
      const progress = loadProgress();
      const missed = missedIds(allIds, progress);
      setMissedCount(missed.length);
      let pick = ids ?? (next === "missed" ? missed : allIds);
      if (pick.length === 0) {
        next = "all";
        pick = allIds;
      }
      let ordered = drillOrder(pick, progress);
      if (next === "quick") ordered = ordered.slice(0, QUICK);
      setMode(next);
      setOrder(ordered);
      setIndex(0);
      setChoice(null);
      setAnswers({});
      setPhase("answering");
    },
    [allIds],
  );

  // "#missed" comes from the exam page's "Review missed" link. A hash keeps the
  // page fully static: it never reaches the Worker.
  useEffect(() => start(window.location.hash === "#missed" ? "missed" : "all"), [start]);

  const q = phase === "answering" || phase === "revealed" ? byId.get(order[index]!) : undefined;
  const letters = useMemo(() => (q ? Object.keys(q.options).sort() : []), [q]);

  const check = useCallback(() => {
    if (!q || !choice) return;
    const correct = choice === q.answer;
    saveProgress(recordAttempt(loadProgress(), q.id, correct));
    setAnswers((a) => ({ ...a, [q.id]: { choice, correct } }));
    setPhase("revealed");
  }, [q, choice]);

  const next = useCallback(() => {
    if (index + 1 >= order.length) {
      setMissedCount(missedIds(allIds, loadProgress()).length);
      setPhase("done");
    } else {
      setIndex(index + 1);
      setChoice(null);
      setPhase("answering");
    }
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [index, order.length, allIds]);

  // Keyboard: A–D or 1–4 picks an option, Enter checks or moves on.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      if (phase === "answering") {
        const key = e.key.toUpperCase();
        const pos = /^[1-9]$/.test(key) ? Number(key) - 1 : letters.indexOf(key);
        if (pos >= 0 && pos < letters.length) {
          setChoice(letters[pos]!);
          e.preventDefault();
        } else if (e.key === "Enter" && choice) {
          check();
          e.preventDefault();
        }
      } else if (phase === "revealed" && e.key === "Enter" && el?.tagName !== "BUTTON") {
        next();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, letters, choice, check, next]);

  if (phase === "loading") return <p className="muted">Loading…</p>;

  const done = Object.values(answers);
  const right = done.filter((a) => a.correct).length;

  const modes = (
    <div className="segmented" role="group" aria-label="Session">
      <button aria-pressed={mode === "all"} onClick={() => start("all")}>
        All {allIds.length}
      </button>
      {allIds.length > QUICK && (
        <button aria-pressed={mode === "quick"} onClick={() => start("quick")}>
          Quick {QUICK}
        </button>
      )}
      <button aria-pressed={mode === "missed"} onClick={() => start("missed")} disabled={missedCount === 0}>
        Missed {missedCount}
      </button>
    </div>
  );

  if (phase === "done") {
    const ids = order.filter((id) => answers[id]);
    const missed = ids.filter((id) => !answers[id]!.correct);
    const pct = ids.length > 0 ? Math.round((right / ids.length) * 100) : 0;
    return (
      <div ref={topRef} className="drill">
        <div className="card">
          <p className="score-big">
            {right}/{ids.length} <span className="muted">· {pct}%</span>
          </p>
          <p className="muted" style={{ marginTop: 0 }}>
            {missed.length === 0
              ? "Every answer right in this session."
              : `${missed.length} to review. Missed questions come first next time you practise.`}
          </p>
          <div className="actions">
            {missed.length > 0 && (
              <button className="button" onClick={() => start("missed", missed)}>
                Retry the {missed.length} missed
              </button>
            )}
            <button className={missed.length > 0 ? "button secondary" : "button"} onClick={() => start(mode)}>
              Practise again
            </button>
            <Link className="button secondary" href={`/exams/${examId}`}>
              Back to the exam
            </Link>
          </div>
        </div>

        <h2>Review</h2>
        <ol className="review">
          {[...missed, ...ids.filter((id) => answers[id]!.correct)].map((id) => {
            const rq = byId.get(id)!;
            const a = answers[id]!;
            return (
              <li key={id} className={a.correct ? "ok" : "miss"}>
                <details open={!a.correct}>
                  <summary>
                    <span className="mark" aria-label={a.correct ? "Right" : "Missed"}>
                      {a.correct ? "✓" : "✗"}
                    </span>
                    <span className="review-stem">{rq.stem}</span>
                  </summary>
                  <div className="review-body small">
                    {!a.correct && (
                      <p>
                        <strong>Your answer, {a.choice}:</strong> {rq.options[a.choice]}
                        <span className="why">{rq.explanation.why_not[a.choice]}</span>
                      </p>
                    )}
                    <p>
                      <strong>Best answer, {rq.answer}:</strong> {rq.options[rq.answer]}
                      <span className="why">{rq.explanation.why_correct}</span>
                    </p>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  const cur = q!;
  const revealed = phase === "revealed";
  const isRight = choice === cur.answer;
  const answeredCount = done.length;

  return (
    <div ref={topRef} className="drill">
      {modes}
      <div className="drill-status">
        <span>
          Question {index + 1} of {order.length}
        </span>
        <span aria-live="polite">
          {answeredCount === 0 ? "No answers yet" : `${right} of ${answeredCount} right`}
        </span>
      </div>
      <div className="steps" aria-hidden="true">
        {order.map((id, i) => (
          <span
            key={id}
            className={answers[id] ? (answers[id]!.correct ? "good" : "bad") : i === index ? "current" : ""}
          />
        ))}
      </div>

      <div className="card">
        <p className="muted small" style={{ marginTop: 0 }}>
          <span className="pill">{cur.difficulty}</span>
        </p>
        <p className="stem">{cur.stem}</p>

        <ul className="options">
          {letters.map((l) => {
            const state = !revealed ? "" : l === cur.answer ? "correct" : l === choice ? "wrong" : "";
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
                    {cur.options[l]}
                    {revealed && (
                      <span className="why" style={{ display: "block" }}>
                        {l === cur.answer ? cur.explanation.why_correct : cur.explanation.why_not[l]}
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
            {isRight ? "Correct." : `Not quite. The best answer is ${cur.answer}.`}
          </p>
        )}

        <div className="actions sticky-actions">
          {!revealed ? (
            <button className="button" onClick={check} disabled={!choice}>
              Check answer
            </button>
          ) : (
            <button className="button" onClick={next} autoFocus>
              {index + 1 >= order.length ? "See results" : "Next question"}
            </button>
          )}
          {answeredCount > 0 && !revealed && (
            <button className="button secondary" onClick={() => setPhase("done")}>
              Finish
            </button>
          )}
        </div>
        <p className="muted small keys">Keys: A–D to pick, Enter to check and continue.</p>
      </div>
    </div>
  );
}
