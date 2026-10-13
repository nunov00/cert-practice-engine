"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID;

// A drill in progress lives only in memory, so it is never reloaded from under
// the learner; they get a banner instead.
const isDrill = (path: string) => path.includes("/drill/");

/**
 * Keeps an installed app current. iOS and Android resume a home-screen app
 * where it was left, with the old page still in memory, instead of loading it
 * again. Each time the app comes back to the screen (and once on load) this
 * reads /version.json, a static file, and reloads if a newer build is live.
 */
export function UpdateCheck() {
  const pathname = usePathname();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!BUILD_ID || process.env.NODE_ENV !== "production") return;
    let checking = false;
    const check = async () => {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        if (!res.ok) return;
        const { build } = (await res.json()) as { build?: string };
        if (!build || build === BUILD_ID) return;
        // Reload at most once per new build, so a stale page can never loop.
        const key = "cpe.reloaded-for";
        try {
          if (window.sessionStorage.getItem(key) === build) return;
          window.sessionStorage.setItem(key, build);
        } catch {
          return;
        }
        if (isDrill(window.location.pathname)) setWaiting(true);
        else window.location.reload();
      } catch {
        // Offline: keep the version we have.
      } finally {
        checking = false;
      }
    };
    check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  // Leaving the drill is a safe moment: load the new version on the next page.
  useEffect(() => {
    if (waiting && !isDrill(pathname)) window.location.reload();
  }, [waiting, pathname]);

  if (!waiting) return null;
  return (
    <div className="update-banner" role="status">
      <span>A new version is ready.</span>
      <button className="button small-button" onClick={() => window.location.reload()}>
        Update now
      </button>
    </div>
  );
}
