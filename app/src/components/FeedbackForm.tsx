"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, MAX_MESSAGE, MIN_MESSAGE, VISITOR_DAILY_LIMIT, cleanPage, type Category } from "@/lib/feedback";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

export function FeedbackForm() {
  const [category, setCategory] = useState<Category>("idea");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState<string | null>(null);
  const [website, setWebsite] = useState(""); // honeypot: hidden from people, filled by bots
  const [state, setState] = useState<State>({ kind: "idle" });

  // The page they came from on this site, as a path only, so we know what the feedback is about.
  useEffect(() => {
    try {
      const ref = new URL(document.referrer);
      if (ref.origin === window.location.origin && ref.pathname !== "/feedback") setPage(cleanPage(ref.pathname));
    } catch {
      // no referrer
    }
  }, []);

  if (state.kind === "sent") {
    return (
      <div className="card stack" role="status">
        <p className="verdict good">Thanks, your feedback was sent.</p>
        <p className="muted">We read every message and use it to decide what to improve next.</p>
        <div className="actions">
          <button
            className="button secondary"
            onClick={() => {
              setMessage("");
              setState({ kind: "idle" });
            }}
          >
            Send more
          </button>
          <a className="button" href={page ?? "/"}>
            Back to practice
          </a>
        </div>
      </div>
    );
  }

  const length = message.trim().length;
  return (
    <form
      className="card stack feedback-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setState({ kind: "sending" });
        try {
          const res = await fetch("/api/feedback", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ category, message, page, website }),
          });
          if (res.ok) return setState({ kind: "sent" });
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setState({ kind: "error", message: data.error ?? "Something went wrong. Please try again." });
        } catch {
          setState({ kind: "error", message: "You seem to be offline. Try again when you're connected." });
        }
      }}
    >
      <label className="field">
        <span>What is it about?</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Your feedback</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={MAX_MESSAGE}
          required
          minLength={MIN_MESSAGE}
          placeholder={
            category === "question"
              ? "Which question, and what looks wrong?"
              : "What would make practising here better?"
          }
        />
        <span className="muted small">
          {length}/{MAX_MESSAGE}. Please don't include your name, email or other personal details.
        </span>
      </label>
      {page && (
        <p className="muted small">
          Sent with the page you came from: <code>{page}</code>{" "}
          <button type="button" className="link-button" onClick={() => setPage(null)}>
            Leave it out
          </button>
        </p>
      )}
      <label className="visually-hidden" aria-hidden="true">
        Leave this empty
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>
      {state.kind === "error" && (
        <p className="verdict bad" role="alert">
          {state.message}
        </p>
      )}
      <div className="actions">
        <button className="button" type="submit" disabled={state.kind === "sending" || length < MIN_MESSAGE}>
          {state.kind === "sending" ? "Sending…" : "Send feedback"}
        </button>
      </div>
      <p className="muted small">
        We keep only your message, the category, the page and the date. No name, email, IP address or cookies. You
        can send up to {VISITOR_DAILY_LIMIT} messages a day.
      </p>
    </form>
  );
}
