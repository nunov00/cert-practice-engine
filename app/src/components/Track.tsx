"use client";

import { useEffect } from "react";
import type { StatEvent } from "@/lib/stats";
import { track } from "@/lib/track";

/** Counts one anonymous event when a static page opens (docs/analytics.md). */
export function Track({ event, exam, domain }: { event: StatEvent; exam: string; domain?: string }) {
  useEffect(() => track(event, exam, domain), [event, exam, domain]);
  return null;
}
