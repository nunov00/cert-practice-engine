import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// One id per build. The page carries it in NEXT_PUBLIC_BUILD_ID and the build
// also publishes it as the static file /version.json; an open app compares the
// two to notice a newer deploy (src/components/UpdateCheck.tsx). Static files
// are served without running the Worker, so the check costs no Worker request.
// The commit, so every load of this config during one build agrees.
function commit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 12);
  try {
    return execSync("git rev-parse --short=12 HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "dev";
  }
}
const BUILD_ID = commit();
writeFileSync(new URL("public/version.json", import.meta.url), JSON.stringify({ build: BUILD_ID }) + "\n");

const nextConfig: NextConfig = {
  // The repo root holds the pnpm workspace and lockfile.
  outputFileTracingRoot: fileURLToPath(new URL("..", import.meta.url)),
  turbopack: { root: fileURLToPath(new URL("..", import.meta.url)) },
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
};

export default nextConfig;

// Lets `next dev` use Cloudflare bindings locally once we add any.
import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev()).catch(() => {});
