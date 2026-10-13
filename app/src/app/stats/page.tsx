import type { Metadata } from "next";
import { StatsDashboard } from "@/components/StatsDashboard";

export const metadata: Metadata = {
  title: "Stats",
  robots: { index: false, follow: false },
};

/** Private to the owner: the numbers load only with their key (docs/analytics.md). */
export default function StatsPage() {
  return (
    <>
      <p className="eyebrow">Private dashboard</p>
      <h1>Stats</h1>
      <p className="lead">What learners have opened and practised so far. Only the site owner can see the numbers.</p>
      <StatsDashboard />
    </>
  );
}
