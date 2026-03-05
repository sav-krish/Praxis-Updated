import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
// pnpm workspace: next lives in root node_modules/.pnpm; root must include it
const root = path.resolve(dir, "..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: root,
  turbopack: {
    root,
  },
};

export default nextConfig;
