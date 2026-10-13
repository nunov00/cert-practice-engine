import type { Metadata } from "next";
import { StatsDashboard } from "@/components/StatsDashboard";

export const metadata: Metadata = {
  title: "Stats",
  robots: { index: false, follow: false },
};

/** Anonymous totals, open to anyone with the link (docs/analytics.md). */
export default function StatsPage() {
  return (
    <>
      <h1>Stats</h1>
      <p className="lead">What learners have opened and practised so far, as anonymous daily totals.</p>
      <StatsDashboard />
    </>
  );
}
