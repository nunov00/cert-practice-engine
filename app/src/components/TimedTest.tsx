"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicQuestion } from "@/lib/content";
import {
  clearTest,
  formatClock,
  loadTest,
  pickQuestions,
  saveTest,
  shuffle,
  timeLimitSeconds,
  type SavedTest,
  type TestKind,
} from "@/lib/exam-session";
import { formatDuration } from "@/lib/format";
import { loadProgress, missedIds, recordAttempt, saveProgress } from "@/lib/progress";

export interface TestDomain {
  id: string;
  name: string;
  weight: number;
}

interface Props {
  examId: string;
  kind: TestKind;
  /** Questions wanted; fewer are used when the bank is smaller. */
  size: number;
  /** The real exam's pace, from the recipe's product.mock. */
  pace: { questions: number; minutes: number };
  domains: TestDomain[];
  questions: PublicQuestion[];
  /** The recipe's min_accuracy_per_domain. */
  target: number;
  /** Set when the test covers one domain only. */
  domainId?: string;
}

type Phase = "loading" | "intro" | "running" | "done";

const LOW_SECONDS = 5 * 60;

export function TimedTest({ examId, kind, size, pace, domains, questions, target, domainId }: Props) {
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const known = useMemo(() => new Set(byId.keys()), [byId]);
  const pools = useMemo(
    () => domains.map((d) => ({ ...d, questionIds: questions.filter((q) => q.domain === d.id).map((q) => q.id) })),
    [domains, questions],
  );
  const [phase, setPhase] = useState<Phase>("loading");
  // For "missed": the questions answered wrong last time, read from this browser.
  const [missed, setMissed] = useState<string[]>([]);
  const count = kind === "missed" ? missed.length : Math.min(size, questions.length);
  const limit = timeLimitSeconds(count, pace);
  const [test, setTest] = useState<SavedTest | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const topRef = useRef<HTMLDivElement>(null);

  const finish = useCallback(
    (t: SavedTest) => {
      let progress = loadProgress();
      for (const id of t.order) {
        const choice = t.answers[id];
        if (choice) progress = recordAttempt(progress, id, choice === byId.get(id)!.answer);
      }
      saveProgress(progress);
      clearTest(examId, kind, domainId);
      setTest(t);
      setPhase("done");
      window.scrollTo({ top: 0 });
    },
    [byId, examId, kind, domainId],
  );

  // A saved test resumes; one whose time ran out while away is marked now.
  useEffect(() => {
    setMissed(missedIds([...known], loadProgress()));
    const saved = loadTest(examId, kind, known, domainId);
    if (saved && saved.deadline <= Date.now()) finish(saved);
    else {
      setTest(saved);
      setPhase("intro");
    }
  }, [examId, kind, known, finish, domainId]);

  const update = useCallback((t: SavedTest) => {
    setTest(t);
    saveTest(t, domainId);
  }, [domainId]);

  const start = () => {
    let order: string[];
    if (kind === "missed") {
      const ids = missedIds([...known], loadProgress());
      setMissed(ids);
      if (ids.length === 0) {
        setTest(null);
        setPhase("intro");
        return;
      }
      order = shuffle(ids);
    } else order = pickQuestions(pools, count);
    const t: SavedTest = {
      version: 1,
      exam: examId,
      kind,
      order,
      answers: {},
      flagged: [],
      index: 0,
      deadline: Date.now() + timeLimitSeconds(order.length, pace) * 1000,
    };
    update(t);
    setNow(Date.now());
    setPhase("running");
  };

  const running = phase === "running" && test !== null;
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running]);

  const remaining = test ? (test.deadline - now) / 1000 : limit;
  useEffect(() => {
    if (running && remaining <= 0) finish(test!);
  }, [running, remaining, test, finish]);

  const q = running ? byId.get(test!.order[test!.index]!) : undefined;
  const letters = useMemo(() => (q ? Object.keys(q.options).sort() : []), [q]);

  const go = useCallback(
    (index: number) => {
      if (!test) return;
      update({ ...test, index: Math.max(0, Math.min(index, test.order.length - 1)) });
      topRef.current?.scrollIntoView({ block: "start" });
    },
    [test, update],
  );

  const choose = useCallback(
    (letter: string) => {
      if (!test || !q) return;
      update({ ...test, answers: { ...test.answers, [q.id]: letter } });
    },
    [test, q, update],
  );

  const submit = useCallback(() => {
    if (!test) return;
    const open = test.order.length - Object.keys(test.answers).length;
    const ask = open > 0 ? `${open} ${open === 1 ? "question is" : "questions are"} unanswered. Finish anyway?` : "Finish the test?";
    if (window.confirm(ask)) finish(test);
  }, [test, finish]);

  // Keyboard: A–D or 1–4 picks, arrows or Enter move.
  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      const k = e.key.toUpperCase();
      const pos = /^[1-9]$/.test(k) ? Number(k) - 1 : letters.indexOf(k);
      if (pos >= 0 && pos < letters.length) choose(letters[pos]!);
      else if (e.key === "ArrowRight" || (e.key === "Enter" && el?.tagName !== "BUTTON")) go(test!.index + 1);
      else if (e.key === "ArrowLeft") go(test!.index - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, letters, choose, go, test]);

  if (phase === "loading") return <p className="muted">Loading…</p>;

  const name = kind === "mock" ? "Mock exam" : kind === "missed" ? "Wrong-answers test" : `Quick ${count}`;

  if (phase === "intro" && kind === "missed" && count === 0 && !test) {
    return (
      <div className="card">
        <p style={{ marginTop: 0 }}>No wrong answers to practise right now. Questions you get wrong in a drill or test will
        appear here.</p>
        <div className="actions">
          <Link className="button" href={`/exams/${examId}`}>
            Back to the exam
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    const answered = test ? Object.keys(test.answers).length : 0;
    return (
      <div className="card">
        <p className="score-big" style={{ fontSize: "1.5rem" }}>
          {count} questions · {formatDuration(Math.round(limit / 60))}
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          {kind === "mock" && count < size
            ? `The real exam has ${size} questions; this one uses all ${count} published so far, with time in proportion. `
            : ""}
          {kind === "missed"
            ? `Every question you got wrong last time${domainId ? " in this domain" : ", across all domains"}, in random order. `
            : "Questions are picked at random, spread across the domains by their exam weight. "}
          You get the same time per question as in the real exam. Answers and explanations are shown at the end, and
          you can go back and change an answer until then.
        </p>
        <div className="actions">
          {test ? (
            <>
              <button
                className="button"
                onClick={() => {
                  setNow(Date.now());
                  setPhase("running");
                }}
              >
                Resume ({answered} of {test.order.length} answered, {formatClock(remaining)} left)
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  if (window.confirm("Discard the test in progress and start a new one?")) start();
                }}
              >
                Start a new one
              </button>
            </>
          ) : (
            <button className="button" onClick={start}>
              Start the {name.toLowerCase()}
            </button>
          )}
          <Link className="button secondary" href={`/exams/${examId}`}>
            Back to the exam
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "done" && test) {
    const ids = test.order;
    const right = ids.filter((id) => test.answers[id] === byId.get(id)!.answer);
    const pct = Math.round((right.length / ids.length) * 100);
    const unanswered = ids.filter((id) => !test.answers[id]).length;
    const perDomain = domains
      .map((d) => {
        const inD = ids.filter((id) => byId.get(id)!.domain === d.id);
        return { ...d, total: inD.length, right: inD.filter((id) => right.includes(id)).length };
      })
      .filter((d) => d.total > 0);
    const missed = ids.filter((id) => !right.includes(id));
    return (
      <div ref={topRef} className="drill">
        <div className="card">
          <p className="score-big">
            {right.length}/{ids.length} <span className="muted">· {pct}%</span>
          </p>
          <p className="muted" style={{ marginTop: 0 }}>
            {pct >= Math.round(target * 100)
              ? `At or above the ${Math.round(target * 100)}% this site aims for in each domain.`
              : `Aim for ${Math.round(target * 100)}% or more in each domain.`}
            {unanswered > 0 ? ` ${unanswered} left unanswered, counted as wrong.` : ""} This is practice, not the
            real exam&apos;s scaled score.
          </p>
          <table className="domain-scores small">
            <tbody>
              {perDomain.map((d) => {
                const p = Math.round((d.right / d.total) * 100);
                return (
                  <tr key={d.id}>
                    <th scope="row">{d.name}</th>
                    <td>
                      {d.right}/{d.total}
                    </td>
                    <td className={p >= Math.round(target * 100) ? "good" : "bad"}>{p}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="actions">
            <button className="button" onClick={start}>
              Take another {name.toLowerCase()}
            </button>
            <Link className="button secondary" href={`/exams/${examId}/missed${domainId ? `/${domainId}` : ""}`}>
              Test wrong answers
            </Link>
            <Link className="button secondary" href={`/exams/${examId}`}>
              Back to the exam
            </Link>
          </div>
        </div>

        <h2>Review</h2>
        <ol className="review">
          {[...missed, ...right].map((id) => {
            const rq = byId.get(id)!;
            const choice = test.answers[id];
            const ok = choice === rq.answer;
            return (
              <li key={id} className={ok ? "ok" : "miss"}>
                <details open={!ok}>
                  <summary>
                    <span className="mark" aria-label={ok ? "Right" : "Missed"}>
                      {ok ? "✓" : "✗"}
                    </span>
                    <span className="review-stem">{rq.stem}</span>
                  </summary>
                  <div className="review-body small">
                    {!ok &&
                      (choice ? (
                        <p>
                          <strong>Your answer, {choice}:</strong> {rq.options[choice]}
                          <span className="why">{rq.explanation.why_not[choice]}</span>
                        </p>
                      ) : (
                        <p>
                          <strong>Not answered.</strong>
                        </p>
                      ))}
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

  const t = test!;
  const cur = q!;
  const answered = Object.keys(t.answers).length;
  const flagged = t.flagged.includes(cur.id);
  const last = t.index + 1 >= t.order.length;

  return (
    <div ref={topRef} className="drill">
      <div className="test-bar">
        <span>
          Question {t.index + 1} of {t.order.length} · {answered} answered
        </span>
        <span className={`timer${remaining <= LOW_SECONDS ? " low" : ""}`} role="timer" aria-label="Time left">
          {formatClock(remaining)}
        </span>
      </div>
      <div className="qgrid" role="navigation" aria-label="Questions">
        {t.order.map((id, i) => (
          <button
            key={id}
            type="button"
            className={[i === t.index ? "current" : "", t.answers[id] ? "done" : "", t.flagged.includes(id) ? "flag" : ""]
              .filter(Boolean)
              .join(" ")}
            aria-label={`Question ${i + 1}${t.answers[id] ? ", answered" : ""}${t.flagged.includes(id) ? ", flagged" : ""}`}
            aria-current={i === t.index ? "step" : undefined}
            onClick={() => go(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="card">
        <p className="stem" style={{ marginTop: 0 }}>
          {cur.stem}
        </p>
        <ul className="options">
          {letters.map((l) => (
            <li key={l}>
              <button type="button" className="option" aria-pressed={t.answers[cur.id] === l} onClick={() => choose(l)}>
                <span className="letter">{l}</span>
                <span>{cur.options[l]}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="actions sticky-actions">
          <button className="button secondary" onClick={() => go(t.index - 1)} disabled={t.index === 0}>
            Back
          </button>
          {last ? (
            <button className="button" onClick={submit}>
              Finish
            </button>
          ) : (
            <button className="button" onClick={() => go(t.index + 1)}>
              Next
            </button>
          )}
          <button
            className="button secondary"
            aria-pressed={flagged}
            onClick={() =>
              update({ ...t, flagged: flagged ? t.flagged.filter((id) => id !== cur.id) : [...t.flagged, cur.id] })
            }
          >
            {flagged ? "Unflag" : "Flag for later"}
          </button>
          {!last && (
            <button className="link-button" onClick={submit}>
              Finish now
            </button>
          )}
        </div>
        <p className="muted small keys">Keys: A–D to pick, arrows or Enter to move.</p>
      </div>
    </div>
  );
}
