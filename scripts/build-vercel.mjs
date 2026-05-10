/**
 * Post-build script: converts TanStack Start's dist/ output into
 * Vercel's Build Output API format (.vercel/output/).
 *
 * Vite's SSR build keeps npm packages as external bare imports, which
 * serverless functions can't resolve. esbuild re-bundles everything into
 * a single self-contained CJS file targeting the Node.js runtime.
 */

import { cpSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");
const out = resolve(root, ".vercel/output");

// ── 1. Clean ────────────────────────────────────────────────────────────────
if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(resolve(out, "static"), { recursive: true });
mkdirSync(resolve(out, "functions/index.func"), { recursive: true });

// ── 2. Static assets ─────────────────────────────────────────────────────────
cpSync(resolve(root, "dist/client"), resolve(out, "static"), { recursive: true });
if (existsSync(resolve(root, "public"))) {
  cpSync(resolve(root, "public"), resolve(out, "static"), { recursive: true });
}

// ── 3. Bundle server → single CJS file ───────────────────────────────────────
// Mark client-only packages external — they're never needed for SSR rendering.
const clientOnlyExternals = [
  "@streamdown/code",    // syntax highlighting — DOM + large parsers
  "@streamdown/mermaid", // diagram rendering — needs mermaid/DOM
  "@streamdown/math",    // LaTeX rendering — katex is DOM-heavy
  "@streamdown/cjk",
  "streamdown",
  "mermaid",
  "motion",
  "motion/react",
  "recharts",
  "embla-carousel-react",
  "react-day-picker",
  "react-resizable-panels",
  "input-otp",
  "vaul",
  "cmdk",
];

// Resolve esbuild binary: prefer direct dep, fall back to Vite's copy
const esbuildBin = existsSync(resolve(root, "node_modules/.bin/esbuild"))
  ? resolve(root, "node_modules/.bin/esbuild")
  : resolve(root, "node_modules/vite/node_modules/.bin/esbuild");

const bundleOut = resolve(out, "functions/index.func/bundle.js");
const externals = [
  "node:*",
  ...clientOnlyExternals,
].map((e) => `--external:${e}`).join(" ");

console.log("Bundling server with esbuild…");
execSync(
  [
    `"${esbuildBin}"`,
    `"${resolve(root, "dist/server/server.js")}"`,
    "--bundle",
    "--format=cjs",
    "--platform=node",
    "--target=node20",
    `--outfile="${bundleOut}"`,
    externals,
    '--define:process.env.NODE_ENV=\\"production\\"',
    "--minify",
    "--log-level=warning",
  ].join(" "),
  { cwd: root, stdio: "inherit" }
);

// ── 4. Serverless Function entry-point ────────────────────────────────────────
// Bridge Node.js IncomingMessage ↔ Web Request/Response so the TanStack Start
// fetch-based handler works inside a Vercel Node.js serverless function.
writeFileSync(
  resolve(out, "functions/index.func/entry.js"),
  `"use strict";
const { default: handler } = require("./bundle.js");

module.exports = async function vercelHandler(req, res) {
  // ── Build Web Request ──────────────────────────────────────────────────────
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host  = req.headers["x-forwarded-host"]  || req.headers.host || "localhost";
  const url   = new URL(req.url, \`\${proto}://\${host}\`);

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    Array.isArray(v) ? v.forEach((h) => headers.append(k, h)) : headers.set(k, v);
  }

  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length) body = Buffer.concat(chunks);
  }

  const webReq = new Request(url.toString(), {
    method: req.method,
    headers,
    body: body || undefined,
    duplex: "half",
  });

  // ── Call handler ───────────────────────────────────────────────────────────
  const webRes = await handler.fetch(webReq, {}, {});

  // ── Write Node.js response ────────────────────────────────────────────────
  res.statusCode = webRes.status;
  for (const [k, v] of webRes.headers.entries()) res.setHeader(k, v);

  if (!webRes.body) { res.end(); return; }

  const reader = webRes.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
};
`
);

writeFileSync(
  resolve(out, "functions/index.func/.vc-config.json"),
  JSON.stringify(
    { runtime: "nodejs20.x", handler: "entry.js", maxDuration: 30 },
    null,
    2
  )
);

// ── 5. Routing config ─────────────────────────────────────────────────────────
writeFileSync(
  resolve(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: "/assets/(.*)",
          headers: { "cache-control": "public, immutable, max-age=31536000" },
          continue: true,
        },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2
  )
);

console.log("✓  Vercel output written to .vercel/output/");
