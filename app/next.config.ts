import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // The repo root holds the pnpm workspace and lockfile.
  outputFileTracingRoot: fileURLToPath(new URL("..", import.meta.url)),
  turbopack: { root: fileURLToPath(new URL("..", import.meta.url)) },
};

export default nextConfig;

// Lets `next dev` use Cloudflare bindings locally once we add any.
import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev()).catch(() => {});
