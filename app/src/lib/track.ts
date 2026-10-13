// Sends anonymous usage counts to /api/stats (docs/analytics.md). Each browser
// counts an item at most once per UTC day: what it has sent today is remembered
// here, so repeat visits cost no Worker request. Nothing identifies the visitor.

import type { StatEvent } from "./stats";

const KEY = "knowmark-counted";

interface Sent {
  day: string;
  keys: string[];
}

function optedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}

export function track(event: StatEvent, exam: string, domain?: string) {
  try {
    if (typeof window === "undefined" || optedOut()) return;
    const day = new Date().toISOString().slice(0, 10);
    const key = `${event}:${exam}:${domain ?? ""}`;
    let sent: Sent = { day, keys: [] };
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Sent | null;
      if (saved?.day === day && Array.isArray(saved.keys)) sent = saved;
    } catch {
      // Unreadable: start today's list again.
    }
    if (sent.keys.includes(key)) return;
    sent.keys.push(key);
    localStorage.setItem(KEY, JSON.stringify(sent));
    const body = JSON.stringify({ event, exam, domain });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/stats", blob)) {
      void fetch("/api/stats", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // Storage blocked or offline: counting is best effort and never gets in the way.
  }
}
