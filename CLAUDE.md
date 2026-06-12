# Startup Oracle

Startup validation platform where founders submit their startup ideas and receive AI-generated deep-dive analysis reports, plus a community for founders to share ideas, follow each other, rate posts, and exchange direct messages.

**Live URL:** https://startup-oracle-chi.vercel.app
**Hosting:** Vercel (auto-deploys from `main` branch)
**Backend:** Supabase (auth, database, storage, realtime)
**AI:** Groq API (llama-3.3-70b-versatile) for report generation

## Quick Start

```bash
npm install
npm run dev          # starts on http://localhost:5173
npm run build        # production build → dist/
```

### Environment Variables

Create `.env.local` in project root:
```
VITE_GROQ_API_KEY=<your-groq-api-key>
```
Get a key at https://console.groq.com/keys

Supabase credentials are hardcoded in `src/supabaseClient.js` (anon key — safe for client-side, protected by RLS).

## Architecture

Single-page React app with view-based routing in `App.jsx`. No React Router — views are switched via `setView()` state. Session view persists across reloads via `sessionStorage`.

### File Map

```
src/
  App.jsx              — Root: auth state, view routing, session persistence, logout
  Home.jsx             — Landing page (Cormorant Garamond serif + DM Sans)
  Auth.jsx             — Sign in/up (Google, GitHub, email/password OAuth)
  SubmitIdea.jsx       — 3-step idea form → triggers AI analysis → shows report
  MasterReport.jsx     — Renders the 6-section validation report (light theme)
  Community.jsx        — Feed, posts, ratings, suggestions, follows, DMs, bell notifications (~1100 lines)
  Account.jsx          — User profile, validated ideas list, click to re-open reports, hard delete
  reportEngine.js      — Groq API calls: 6 parallel sections, adaptive token management, retry logic
  communityDB.js       — All Supabase queries for community features (posts, follows, DMs, ratings)
  ideasDB.js           — Save/load/delete validated ideas (Supabase + localStorage fallback)
  supabaseClient.js    — Supabase client init (hardcoded anon key)
  index.css            — Font imports (Cormorant Garamond, DM Sans, Plus Jakarta Sans, DM Mono, Syne)
  main.jsx             — React entry point

Root SQL migrations (run manually in Supabase SQL Editor):
  supabase_community_tables.sql  — profiles, community_posts, ratings, suggestions, follows, messages + RLS
  supabase_ideas_table.sql       — ideas table for validated reports
  supabase_messages_table.sql    — DM messages table + realtime
  supabase_follow_requests.sql   — adds status column to follows (pending/accepted) + RLS for accept/reject
  supabase_post_media.sql        — adds media column to posts + post-media storage bucket
```

### Key Patterns

- **Auth flow**: OAuth (Google/GitHub) via Supabase implicit grant. Hash tokens parsed in `App.jsx`, `setSession()` called, then redirect to intended view via `localStorage.afterAuth`.
- **Hard logout**: `signOut({ scope: 'global' })` revokes all sessions + clears all `sb-*` localStorage keys.
- **View persistence**: `sessionStorage.so_view` survives reloads. Stale `account` view auto-redirects to `oracle` if user is signed out.
- **Report generation**: 6 sections × 44 sub-keys analyzed in parallel (2 workers). Each section gets its own Groq API call with role-specific prompt. Adaptive token management: starts at 4000 max_tokens, halves on 413 errors (Groq free tier limit), retries up to 4 times. 429/5xx gets exponential backoff.
- **Follow requests**: Instagram-style. New follows create `status: 'pending'` row. Recipient sees them in bell notification dropdown (30s polling). Accept flips to `accepted`, reject deletes the row.
- **Graceful fallbacks**: All community DB functions handle missing `status` column or `media` column gracefully (for environments where SQL migrations haven't been run yet).
- **PostgREST joins**: Explicit FK hints like `profiles!community_posts_user_id_fkey` to disambiguate when multiple join paths exist.

## Supabase Setup

The SQL migration files must be run in Supabase SQL Editor in this order:
1. `supabase_community_tables.sql` — base tables
2. `supabase_ideas_table.sql` — ideas storage
3. `supabase_messages_table.sql` — DM system
4. `supabase_follow_requests.sql` — follow request workflow
5. `supabase_post_media.sql` — media uploads

All tables have Row-Level Security (RLS) enabled. The `messages` table has Supabase Realtime enabled for live DM delivery.

OAuth providers (Google, GitHub) are configured in the Supabase Dashboard under Authentication > Providers.

## Deployment

Deployed on Vercel. Push to `main` triggers auto-deploy.

```bash
npm run build
# Or: vercel --prod
```

The `VITE_GROQ_API_KEY` env var must be set in Vercel project settings (Settings > Environment Variables) with Production + Preview scopes enabled.

## Design System

- **Fonts**: Cormorant Garamond (serif headings on Home), DM Sans (body), Plus Jakarta Sans (forms/buttons)
- **Theme**: Light/white minimal. No dark mode. CSS variables not used — colors are inline constants per component.
- **Color constants**: Each component defines its own `C` object with `black`, `white`, `border`, `muted`, `light`, `body` etc.
- **No component library** — everything is custom inline-styled React components.

## Known Constraints

- Groq free tier has ~6000 tokens/min TPM limit. Reports may take 1-2 minutes on free tier. Paid API would be faster.
- Report generation uses `llama-3.3-70b-versatile` model. If Groq retires it, update `MODEL` in `reportEngine.js`.
- No test suite exists. Changes should be verified manually in the browser.
- Community.jsx is ~1100 lines. If refactoring, consider splitting out the DM panel, profile view, and composer modal.
