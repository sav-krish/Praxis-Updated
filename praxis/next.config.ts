import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
/** Use the monorepo root locally for workspace packages; Vercel uploads `praxis/` as the project root. */
const root = process.env.VERCEL ? dir : path.resolve(dir, "..");

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
