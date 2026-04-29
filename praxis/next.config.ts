import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
/** Monorepo root (parent of `praxis/`). Required so Next’s file tracing and Turbopack resolve packages from root `node_modules/.pnpm/` when invoked via workspace `pnpm`. */
const root = path.resolve(dir, "..");

const nextConfig: NextConfig = {
  // Keep trace output consistent with cwd when the app folder is nested under a workspace root (Vercel/CI builds).
  outputFileTracingRoot: root,
  turbopack: {
    // Same root wiring for Turbopack so dev/build resolve shared workspace deps reliably.
    root,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
