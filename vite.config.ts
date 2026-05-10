import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Forward VITE_* / SUPABASE_* / GROQ_* to process.env so server-side code can read them
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }

  return {
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
      dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
    },
    server: {
      host: true,
      port: process.env.PORT ? Number(process.env.PORT) : 3000,
    },
    plugins: [
      tsConfigPaths(),
      tailwindcss(),
      tanstackStart({
        server: {
          preset: "vercel",
          entry: "server",
        },
      }),
      viteReact(),
    ],
  };
});
