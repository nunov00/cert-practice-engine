// Prints the feedback inbox for a review, as Markdown (docs/feedback.md).
// Works for any agent (Claude, Codex, ...) or person: needs FEEDBACK_AGENT_TOKEN
// (the agent's own read-only key) or FEEDBACK_READ_TOKEN in the environment.
// Output goes to the terminal only: never commit it, paste it into a public
// place, or run this in GitHub Actions (the repo and its logs are public).
//
//   pnpm --filter @cpe/app run feedback            # new messages
//   pnpm --filter @cpe/app run feedback -- --all   # everything
import { CATEGORIES, type FeedbackRow } from "../src/lib/feedback.ts";

const DEFAULT_URL = "https://cert-practice-engine.vitoria-nuno.workers.dev";

export function summarise(rows: FeedbackRow[], all: boolean): string {
  const shown = all ? rows : rows.filter((r) => r.status === "new");
  const label = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
  const lines = [`# Feedback (${shown.length} ${all ? "in total" : "new"}, ${rows.length} stored)`, ""];
  for (const r of shown) {
    const where = r.page ? ` · ${r.page}` : "";
    lines.push(`- **#${r.id}** ${r.created_at.slice(0, 10)} · ${label(r.category)} · ${r.status}${where}`);
    lines.push(`  ${r.message.replace(/\n/g, "\n  ")}`);
  }
  return lines.join("\n");
}

async function main() {
  const token = process.env.FEEDBACK_AGENT_TOKEN ?? process.env.FEEDBACK_READ_TOKEN;
  if (!token) {
    console.error("Set FEEDBACK_AGENT_TOKEN (read-only) or FEEDBACK_READ_TOKEN. See docs/feedback.md.");
    process.exit(2);
  }
  if (process.env.GITHUB_ACTIONS) {
    console.error("Refusing to print private feedback into GitHub Actions logs (the repo is public).");
    process.exit(2);
  }
  const base = process.env.FEEDBACK_URL ?? DEFAULT_URL;
  const res = await fetch(`${base}/api/feedback/inbox`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) {
    console.error(`${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const { feedback } = (await res.json()) as { feedback: FeedbackRow[] };
  console.log(summarise(feedback, process.argv.includes("--all")));
}

if (process.argv[1]?.endsWith("feedback.ts")) await main();
