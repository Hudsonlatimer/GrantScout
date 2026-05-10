/**
 * Post-build script: converts TanStack Start's dist/ output into
 * Vercel's Build Output API format (.vercel/output/).
 *
 * Run via: node scripts/build-vercel.mjs
 */

import { cpSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");
const out = resolve(root, ".vercel/output");

// ── 1. Clean ────────────────────────────────────────────────────────────────
if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(resolve(out, "static"), { recursive: true });
mkdirSync(resolve(out, "functions/index.func"), { recursive: true });

// ── 2. Static assets ─────────────────────────────────────────────────────────
// dist/client  →  .vercel/output/static
cpSync(resolve(root, "dist/client"), resolve(out, "static"), { recursive: true });

// public/  →  .vercel/output/static  (robots.txt etc.)
if (existsSync(resolve(root, "public"))) {
  cpSync(resolve(root, "public"), resolve(out, "static"), { recursive: true });
}

// ── 3. Edge Function bundle ───────────────────────────────────────────────────
// Copy the entire server bundle into the function directory so that
// all dynamic import() chunks resolve correctly via relative paths.
cpSync(resolve(root, "dist/server"), resolve(out, "functions/index.func"), {
  recursive: true,
});

// Thin entry-point wrapper: Vercel Edge expects a default-exported fetch handler.
writeFileSync(
  resolve(out, "functions/index.func/entry.js"),
  `import handler from "./server.js";
export default (request) => handler.fetch(request, {}, {});
`
);

// Edge function metadata
writeFileSync(
  resolve(out, "functions/index.func/.vc-config.json"),
  JSON.stringify({ runtime: "edge", entrypoint: "entry.js" }, null, 2)
);

// ── 4. Routing config ─────────────────────────────────────────────────────────
const config = {
  version: 3,
  routes: [
    // Immutable cache headers for hashed asset chunks
    {
      src: "/assets/(.*)",
      headers: { "cache-control": "public, immutable, max-age=31536000" },
      continue: true,
    },
    // Serve static files first (robots.txt, favicon, etc.)
    { handle: "filesystem" },
    // Everything else → SSR edge function
    { src: "/(.*)", dest: "/index" },
  ],
};

writeFileSync(resolve(out, "config.json"), JSON.stringify(config, null, 2));

console.log("✓  Vercel output written to .vercel/output/");
