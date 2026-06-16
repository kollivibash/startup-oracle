# Startup Oracle

Startup validation platform: founders submit ideas and get an AI-generated 6-section deep-dive
report, plus a LinkedIn-style community to share ideas, follow founders, rate posts, comment,
repost, DM, and (when billing is switched on) subscribe for a Verified Founder badge.

**Live URL:** https://startup-oracle-seven.vercel.app
**Hosting:** Vercel (auto-deploys from `main`)
**Backend:** Supabase (auth, Postgres + RLS, storage, realtime)
**AI:** Google **Gemini 2.5-flash** via a serverless proxy (`api/generate.js`) — key is server-side
**Payments:** Razorpay subscriptions (code complete, **dormant** until the owner finishes setup)

## Quick Start

```bash
npm install
npm run dev          # http://localhost:5173  (does NOT serve /api — see note below)
npm run build        # production build → dist/
npx eslint src/...   # lint
```

### Environment Variables

`.env.local` (gitignored) — server-side only, NO `VITE_` prefix (that would bundle it to the client):
```
GEMINI_API_KEY=<your-gemini-key>
```
On Vercel set `GEMINI_API_KEY` (Production + Preview). Supabase anon key is hardcoded in
`src/supabaseClient.js` and `api/*.js` (safe — public, protected by RLS).

> **`/api/*` only runs on the deployed Vercel site, NOT in `npm run dev`** (Vite doesn't serve
> serverless functions). So report generation, live news, link previews, and Razorpay don't work
> locally — every caller degrades gracefully (fails open / shows fallback). Use `npx vercel dev`
> if you need `/api` locally.

## Architecture

Single-page React (Vite). No React Router — `App.jsx` switches views via `setView()`. Views:
`oracle` (Home), `submit`, `community`, `account`, `pricing`, `auth`, `report`. `sessionStorage.so_view`
persists across reloads; the **browser Back button** is wired to the view via History API
(`pushState`/`popstate`) so Back returns to the previous view.

Styling is **inline styles** everywhere except `MasterReport.jsx`, which uses **Tailwind v4**
(`@tailwindcss/vite`, `@import "tailwindcss"` in `index.css`).

### File Map

```
src/
  App.jsx          — routing, auth state, OAuth hash handling, browser-back history sync
  Home.jsx         — landing (serif hero; CTAs: "Build Community", "Analyse Idea", "Pricing")
  Auth.jsx         — sign in/up (Google, GitHub, email/password)
  SubmitIdea.jsx   — 3-step form → quota check (consume_validation) → Gemini report; paywall screen
  MasterReport.jsx — 6-section report (Tailwind), score dashboard on Validation→Summary, share-to-community
  Community.jsx    — the community (~1900 lines): feed, composer (post/poll/article), Rate (1–10),
                     threaded comments+likes, repost, save, follow (approval), notifications bell,
                     rich profiles, photo carousel + fullscreen lightbox, link previews, verified
                     badge, "Followed by X" social proof, mobile bottom nav, and rich realtime DMs
                     (attachments: photo/video/doc/voice-note; emoji picker; reply; forward;
                     message reactions; read receipts; typing indicator; delete-for-me / unsend)
  Pricing.jsx      — pricing page (₹50/mo, ₹500/yr) + Razorpay checkout
  Account.jsx      — account, validated-ideas list, re-open reports, hard delete
  reportEngine.js  — 6 Gemini section calls via /api/generate (2-worker concurrency, retries/backoff)
  communityDB.js   — all community Supabase queries
  billingDB.js     — subscription state, consume/refund validation RPCs, verified ids, start checkout
  ideasDB.js       — save/load/delete validated ideas (Supabase + localStorage fallback)
  supabaseClient.js, index.css, main.jsx

api/ (Vercel serverless — keys live here, never in the client bundle)
  generate.js          — Gemini proxy (auth-gated, model whitelist, prompt size cap)
  news.js              — live startup news (server-side TechCrunch RSS fetch)
  unfurl.js            — link-preview OG scraper (auth-gated, SSRF guards)
  razorpay-subscribe.js— create a Razorpay subscription (auth-gated)
  razorpay-webhook.js  — activate/deactivate subscription + verified badge (uses service-role key)
```

### SQL migrations — run in Supabase SQL Editor in THIS order

```
1.  supabase_community_tables.sql   profiles, posts, ratings, suggestions, follows, + RLS
2.  supabase_ideas_table.sql        ideas storage
3.  supabase_messages_table.sql     DMs + realtime
4.  supabase_follow_requests.sql    follows.status (pending/accepted) + accept/reject RLS
5.  supabase_post_media.sql         posts.media + post-media storage bucket
6.  supabase_post_meta.sql          posts.meta (validated-idea score badge)
7.  supabase_notifications.sql      notifications table
8.  supabase_engagement.sql         post_reactions*, suggestion likes/replies, repost_of, saved_posts
9.  supabase_profiles_rich.sql      profile fields (about/skills/experience/…) + avatars bucket
10. supabase_network.sql            connections* (unused) + profile_views ("who viewed your profile")
11. supabase_posts_extra.sql        kind/poll/link_preview + poll_votes
12. supabase_message_media.sql      messages.media/reply_to/reactions/deleted_for/forwarded +
                                    text nullable + broadened update RLS (rich DMs; reuses post-media bucket)
13. supabase_billing.sql            LAST — only when Razorpay is ready (see Billing below)
```
\* `post_reactions` and `connections` tables exist but their UI was removed (see Constraints).
All community/billing DB calls **degrade gracefully** if a column/table/RPC is missing, so the
app keeps working before each migration is run.

## Community feature set (current)

Feed with tabs (All / Top Rated / Most Discussed / Following / Saved); composer modes Post / Poll /
Article; **Rate 1–10** is the only post engagement (post reactions/Like were removed); threaded
comments with likes + replies; repost with commentary (embedded original); save/bookmark; **follow
is approval-based** (Instagram-style requests in the bell, 30s polling); **rich realtime DMs**
(photo/video/document/voice-note attachments, built-in emoji picker, reply, forward, message
reactions, "Seen" read receipts, typing indicator, delete-for-me + unsend-before-read); rich profiles
(headline/About/Experience/Education/Skills, avatar+banner upload, profile-strength meter, "Who
viewed your profile"); **"Followed by X and Y"** social proof on profiles + sidebar suggestions;
multi-photo **carousel + fullscreen lightbox** (arrows, dots, Esc/arrow keys); link previews; polls;
shareable post permalinks (`#/idea/:id`); live Startup News; "Founders to follow"; Openings (placeholder);
mobile bottom nav; **Verified Founder badge** (Instagram-style blue check) for active subscribers.

**Removed on purpose:** post reactions/Like (Rate replaces them); the whole connections / "My Network"
feature (followers + following only).

## Billing (DORMANT — do not enable until the domain is bought)

Subscription model via **Razorpay**: ₹50/month, ₹500/year. Free tier = **1 validation total**;
subscribers get **2 validations/month** + the verified badge. `consume_validation()` /
`refund_validation()` Postgres RPCs gate it atomically (quota constant is `2` in `supabase_billing.sql`).
Until `supabase_billing.sql` is run, gating **fails open** (everyone validates freely).

To go live (owner): create Razorpay account + 2 Plans (monthly 5000 paise, yearly 50000 paise);
add Vercel env vars `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_MONTHLY`,
`RAZORPAY_PLAN_YEARLY`, `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`; run
`supabase_billing.sql`; configure the Razorpay webhook → `/api/razorpay-webhook`.

## Key Patterns

- **Auth**: OAuth implicit grant; hash tokens parsed in `App.jsx`; `localStorage.afterAuth` carries the
  intended destination across the redirect. Hard logout revokes all sessions + clears `sb-*` keys.
- **Report generation**: 6 sections, each its own Gemini call through `/api/generate`
  (`GEMINI_API_KEY` server-side, model whitelist, prompt cap, retries + backoff). `MasterReport` shows
  a score dashboard (ring + sub-score bars) from the validation `_meta`.
- **PostgREST joins**: explicit FK hints, e.g. `profiles!community_posts_user_id_fkey`.
- **Graceful degradation**: variant-ladder selects + try/catch fallbacks so missing migrations never
  crash the app.

## Design System

- **Theme**: **black & white minimal** (was briefly green — reverted). The only color accent is the
  blue Instagram-style verified badge. No dark mode. Colors are inline constants per component
  (Community uses `GREEN`/`GREEN_SOFT`/`INK` constants — note `GREEN` is now `#0f172a`, i.e. black).
- **Fonts**: DM Sans (community/body), Plus Jakarta Sans (forms/report), Cormorant Garamond (Home serif).
- No component library; everything is custom.

## Known Constraints / Gotchas

- Commit/push to `main` = auto-deploy. End commit messages with the Co-Authored-By line.
- `/api/*` doesn't run under `npm run dev` — test those on the deployed site or via `npx vercel dev`.
- Billing + the "Followed by X" social proof can't be verified locally (need real auth + follow graph).
- No test suite — verify changes in the browser.
- `Community.jsx` is ~1700 lines; consider splitting (DM panel, ProfileView, composer, media) if refactoring.
