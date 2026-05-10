# GrantScout

Match Canadian small businesses with government grants, loans, tax credits, and wage subsidies they actually qualify for.

Built with TanStack Start, Supabase, and Groq (llama-3.3-70b).

---

## What it does

- **Profile-aware matching** — fill out a short business profile once; the AI uses it in every reply without asking again
- **Grounded recommendations** — the AI only surfaces programs from a curated Canadian database, no hallucinated URLs
- **Federal + provincial** — covers programs across all provinces including SR&ED, IRAP, CanExport, CDAP, Canada Job Grant, and more
- **Persistent chat history** — conversations sync to your account via Supabase, not localStorage
- **Intent-aware bot** — greetings get a conversational reply; funding questions trigger the grant lookup tool

---

## Tech stack

| Layer | What |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR, file-based routing) |
| Auth + DB | [Supabase](https://supabase.com) (auth, RLS, Postgres) |
| AI | [Groq](https://groq.com) — llama-3.3-70b-versatile via AI SDK |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Deploy target | Cloudflare Workers |

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/Hudsonlatimer/GrantScout.git
cd GrantScout
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

VITE_SUPABASE_PROJECT_ID=your-project-id

GROQ_API_KEY=your-groq-api-key
```

### 3. Run Supabase migrations

In your Supabase project's SQL editor, run the migration files in order:

```
supabase/migrations/
```

These create the `business_profiles` and `chat_threads` tables with RLS policies.

### 4. Start the dev server

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
src/
  routes/
    index.tsx          # Landing page
    auth.tsx           # Sign in / sign up
    profile.tsx        # Business profile onboarding
    app.tsx            # Chat app (auth-gated)
    api/chat.ts        # Groq streaming endpoint + tool definitions
  lib/
    grants/
      data.ts          # Curated Canadian programs database
      match.ts         # Matching logic with fallback tiers
    ai/
      system-prompt.ts # GrantScout system prompt
  hooks/
    use-threads.ts     # Supabase-backed chat thread management
    use-business-profile.ts
  components/
    grant-chat.tsx     # Main chat UI with sidebar
```

---

## Deployment

The project targets Cloudflare Workers via `@cloudflare/vite-plugin`.

```bash
npm run build
npx wrangler deploy
```

Set your environment variables in the Cloudflare dashboard under **Workers & Pages → Settings → Environment Variables**.
