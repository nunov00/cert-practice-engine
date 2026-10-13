"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, STATUSES, type FeedbackRow, type Status } from "@/lib/feedback";

// The key stays in this tab only (sessionStorage), never in the URL or on disk.
const KEY = "knowmark:feedback-key";

const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export function FeedbackInbox() {
  const [key, setKey] = useState("");
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const [filter, setFilter] = useState<Status | "all">("new");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(path: string, init: RequestInit = {}, k = key): Promise<Response | null> {
    setError(null);
    const res = await fetch(path, { ...init, headers: { ...init.headers, authorization: `Bearer ${k}` } }).catch(
      () => null,
    );
    if (!res) setError("Couldn't reach the site.");
    else if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Request failed (${res.status}).`);
      if (res.status === 401) {
        setRows(null);
        try {
          sessionStorage.removeItem(KEY);
        } catch {}
      }
      return null;
    }
    return res;
  }

  async function load(k = key) {
    setBusy(true);
    const res = await call("/api/feedback/inbox", {}, k);
    if (res) {
      setRows(((await res.json()) as { feedback: FeedbackRow[] }).feedback);
      try {
        sessionStorage.setItem(KEY, k);
      } catch {}
    }
    setBusy(false);
  }

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(KEY);
    } catch {}
    if (saved) {
      setKey(saved);
      void load(saved);
    }
  }, []);

  if (!rows) {
    return (
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <p className="muted">Only the site owner can read feedback. Enter the access key to continue.</p>
        <label className="field">
          <span>Access key</span>
          <input type="password" autoComplete="current-password" value={key} onChange={(e) => setKey(e.target.value)} />
        </label>
        {error && (
          <p className="verdict bad" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button className="button" type="submit" disabled={busy || !key}>
            Open inbox
          </button>
        </div>
      </form>
    );
  }

  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length]));

  return (
    <div className="stack">
      <div className="actions inbox-bar">
        <label className="field inline">
          <span>Show</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value as Status | "all")}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s} ({counts[s]})
              </option>
            ))}
            <option value="all">all ({rows.length})</option>
          </select>
        </label>
        <button className="button secondary" onClick={() => void load()} disabled={busy}>
          Refresh
        </button>
        <button
          className="button secondary"
          onClick={async () => {
            const res = await call("/api/feedback/inbox?format=csv");
            if (!res) return;
            const url = URL.createObjectURL(await res.blob());
            const a = Object.assign(document.createElement("a"), {
              href: url,
              download: `feedback-${new Date().toISOString().slice(0, 10)}.csv`,
            });
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download CSV
        </button>
        <button
          className="button secondary"
          onClick={() => {
            try {
              sessionStorage.removeItem(KEY);
            } catch {}
            setKey("");
            setRows(null);
          }}
        >
          Lock
        </button>
      </div>
      {error && (
        <p className="verdict bad" role="alert">
          {error}
        </p>
      )}
      {shown.length === 0 && <p className="muted">Nothing here.</p>}
      <ul className="inbox">
        {shown.map((r) => (
          <li key={r.id} className="card stack">
            <p className="muted small">
              {r.created_at.slice(0, 16).replace("T", " ")} UTC · {categoryLabel(r.category)}
              {r.page && (
                <>
                  {" · "}
                  <a href={r.page}>{r.page}</a>
                </>
              )}
            </p>
            <p className="inbox-message">{r.message}</p>
            <div className="actions">
              <select
                aria-label="Status"
                value={r.status}
                onChange={async (e) => {
                  const status = e.target.value as Status;
                  const res = await call("/api/feedback/inbox", {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ id: r.id, status }),
                  });
                  if (res) setRows(rows.map((x) => (x.id === r.id ? { ...x, status } : x)));
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                className="link-button"
                onClick={async () => {
                  if (!confirm("Delete this feedback for good?")) return;
                  const res = await call(`/api/feedback/inbox?id=${r.id}`, { method: "DELETE" });
                  if (res) setRows(rows.filter((x) => x.id !== r.id));
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
