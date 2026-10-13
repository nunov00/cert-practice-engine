// Capacity check for one Cloudflare Worker deployment (docs/platform-limits.md).
// Run after `opennextjs-cloudflare build`: `pnpm --filter @cpe/app run capacity`.
// Over a Free-plan limit: error, exit 1 (the deploy script stops here).
// Over our own budget: warning only. The budget keeps each pilot to a fraction
// of the Free plan so several can share one account.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const MiB = 1024 * 1024;

export interface Measure {
  /** Files Cloudflare uploads as static assets for this version. */
  assetFiles: number;
  largestAsset: { path: string; bytes: number };
  /** Worker script as uploaded (wrangler's "Total Upload"). */
  workerBytes: number;
  /** Shown for reference by wrangler; not a Cloudflare limit any more. */
  workerGzipBytes: number;
  staticRedirects: number;
  dynamicRedirects: number;
}

export interface Rule {
  key: keyof Omit<Measure, "largestAsset"> | "largestAssetBytes";
  label: string;
  unit: "count" | "bytes";
  /** Cloudflare Free plan hard limit; null when Cloudflare sets none. */
  limit: number | null;
  /** Our per-pilot budget. */
  budget: number;
}

// Verified 2026-10-13 against developers.cloudflare.com/workers/platform/limits/
// and .../static-assets/redirects/. Re-check before raising a budget.
export const RULES: Rule[] = [
  { key: "assetFiles", label: "Static asset files", unit: "count", limit: 20_000, budget: 4_000 },
  { key: "largestAssetBytes", label: "Largest asset file", unit: "bytes", limit: 25 * MiB, budget: 5 * MiB },
  { key: "workerBytes", label: "Worker size (uncompressed)", unit: "bytes", limit: 64 * MiB, budget: 16 * MiB },
  // Former Free-plan limit (3 MiB compressed), kept as our budget so the app
  // still fits if Cloudflare brings a compressed limit back.
  { key: "workerGzipBytes", label: "Worker size (gzip)", unit: "bytes", limit: null, budget: 3 * MiB },
  { key: "staticRedirects", label: "Static _redirects rules", unit: "count", limit: 2_000, budget: 400 },
  { key: "dynamicRedirects", label: "Dynamic _redirects rules", unit: "count", limit: 100, budget: 20 },
];

export type Level = "ok" | "over-budget" | "over-limit";

export interface Row {
  rule: Rule;
  value: number;
  level: Level;
}

export function assess(m: Measure, rules: Rule[] = RULES): Row[] {
  return rules.map((rule) => {
    const value = rule.key === "largestAssetBytes" ? m.largestAsset.bytes : m[rule.key];
    const level: Level =
      rule.limit !== null && value > rule.limit ? "over-limit" : value > rule.budget ? "over-budget" : "ok";
    return { rule, value, level };
  });
}

/** Counts `_redirects` rules the way Cloudflare does: a splat or placeholder makes a rule dynamic. */
export function countRedirects(text: string): { static: number; dynamic: number } {
  let s = 0;
  let d = 0;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const source = line.split(/\s+/)[0] ?? "";
    if (source.includes("*") || /(^|\/):[A-Za-z]/.test(source)) d++;
    else s++;
  }
  return { static: s, dynamic: d };
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

/** Measures `.open-next/` after a build. Uses `wrangler deploy --dry-run` for the Worker bundle. */
export function measure(appDir: string): Measure {
  const assetsDir = join(appDir, ".open-next", "assets");
  if (!existsSync(assetsDir)) throw new Error(`${assetsDir} not found: run opennextjs-cloudflare build first`);

  const assets = walk(assetsDir).filter((p) => !p.endsWith(".assetsignore"));
  let largestAsset = { path: "", bytes: 0 };
  for (const p of assets) {
    const bytes = statSync(p).size;
    if (bytes > largestAsset.bytes) largestAsset = { path: relative(assetsDir, p), bytes };
  }
  const redirectsFile = join(assetsDir, "_redirects");
  const redirects = existsSync(redirectsFile)
    ? countRedirects(readFileSync(redirectsFile, "utf8"))
    : { static: 0, dynamic: 0 };

  const out = mkdtempSync(join(tmpdir(), "capacity-"));
  try {
    execFileSync("pnpm", ["exec", "wrangler", "deploy", "--dry-run", "--outdir", out], {
      cwd: appDir,
      stdio: ["ignore", "ignore", "inherit"],
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    });
    let workerBytes = 0;
    let workerGzipBytes = 0;
    for (const p of walk(out)) {
      if (p.endsWith(".map") || p.endsWith("README.md")) continue;
      const buf = readFileSync(p);
      workerBytes += buf.length;
      workerGzipBytes += gzipSync(buf).length;
    }
    return {
      assetFiles: assets.length,
      largestAsset,
      workerBytes,
      workerGzipBytes,
      staticRedirects: redirects.static,
      dynamicRedirects: redirects.dynamic,
    };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

function fmt(n: number | null, unit: Rule["unit"]): string {
  if (n === null) return "none";
  return unit === "bytes" ? `${(n / MiB).toFixed(2)} MiB` : n.toLocaleString("en-US");
}

export function report(rows: Row[], m: Measure): string {
  const lines = [
    "| Check | Now | Budget | Free limit | Status |",
    "|---|---|---|---|---|",
    ...rows.map(({ rule, value, level }) => {
      const pct = rule.limit ? ` (${((value / rule.limit) * 100).toFixed(1)}% of limit)` : "";
      const status = level === "ok" ? "ok" : level === "over-budget" ? "over budget" : "OVER FREE LIMIT";
      return `| ${rule.label} | ${fmt(value, rule.unit)}${pct} | ${fmt(rule.budget, rule.unit)} | ${fmt(rule.limit, rule.unit)} | ${status} |`;
    }),
    "",
    `Largest asset: \`${m.largestAsset.path}\``,
  ];
  return lines.join("\n");
}

function main() {
  const appDir = fileURLToPath(new URL("..", import.meta.url));
  const m = measure(appDir);
  const rows = assess(m);
  const table = report(rows, m);
  console.log(`Cloudflare capacity (per Worker, see docs/platform-limits.md)\n\n${table}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Cloudflare capacity\n\n${table}\n`);
  }
  const ci = Boolean(process.env.GITHUB_ACTIONS);
  for (const { rule, value, level } of rows) {
    if (level === "ok") continue;
    const msg =
      level === "over-limit"
        ? `${rule.label} is ${fmt(value, rule.unit)}, over the Cloudflare Free limit of ${fmt(rule.limit, rule.unit)}. Going past it is an owner cost decision.`
        : `${rule.label} is ${fmt(value, rule.unit)}, over our per-pilot budget of ${fmt(rule.budget, rule.unit)} (Free limit ${fmt(rule.limit, rule.unit)}).`;
    console.log(ci ? `::${level === "over-limit" ? "error" : "warning"} title=Capacity::${msg}` : `${level}: ${msg}`);
  }
  if (rows.some((r) => r.level === "over-limit")) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
