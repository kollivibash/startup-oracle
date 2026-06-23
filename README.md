# Startup Oracle

AI-powered startup validation platform + a LinkedIn-style founder community. Submit a startup idea and
get an AI-generated **6-section deep-dive report**, then share ideas, follow founders, rate posts,
comment, repost, and DM in the community.

**Live:** https://startup-oracle-seven.vercel.app

> Full architecture, database setup, and conventions live in **[CLAUDE.md](CLAUDE.md)** — read that first.

## Features

### Idea validation
- 3-step submission form (basics → details → review) with a server-authoritative quota gate
- AI generates a 6-section report — **Validation** (scores, market demand, unit economics, roadmap,
  customer journey), **Market Analysis**, **Business Plan**, **Brand Strategy**, **Brand Visuals**,
  **Marketing Suite** — localized to the founder's target market
- Score dashboard (ring + sub-scores), PDF/print export, share-to-community
- Reports saved to your account; re-open anytime

### Community
- Feed with tabs (All / Top Rated / Most Discussed / Following / Saved) + pagination
- Composer: post / poll / article, with an **audience picker** (Everyone / Followers / Only me) and
  edit-after-posting
- Rate (1–10), threaded comments + likes, repost, save, approval-based follow, notifications bell
- Rich real-time DMs (attachments, reactions, reply, forward, read receipts, typing, unsend + undo)
- Rich profiles, photo carousel + lightbox, link previews, Verified Founder badge

### Auth
- Google / GitHub OAuth, email/password (with password reset), phone/OTP scaffold (India-first)
- In-app-webview detection, session persistence, hard global logout
- Reachable Terms / Privacy pages (DPDP-aware)

## Tech stack

- **Frontend:** React 19 + Vite (rolldown); inline styles everywhere except `MasterReport.jsx` (Tailwind v4)
- **Backend:** Supabase (Postgres + RLS, Auth, Storage, Realtime)
- **AI:** Google **Gemini 2.5-flash** via a serverless proxy (`api/generate.js`) — key stays server-side
- **Payments:** Razorpay subscriptions (code complete, **dormant** until the owner finishes setup)
- **Hosting:** Vercel (auto-deploys from `main`)

## Setup

```bash
npm install
npm run dev        # http://localhost:5173  (NOTE: /api/* does NOT run under vite dev — only on Vercel
                   #                          or `npx vercel dev`. The community feed works in dev.)
npm run build
npx eslint src/<file>
```

`.env.local` (gitignored) — **server-side only, NO `VITE_` prefix** (that would bundle the key to the client):

```
GEMINI_API_KEY=<your-gemini-key>
```

On Vercel set `GEMINI_API_KEY` (Production + Preview). The Supabase anon key is hardcoded in
`src/supabaseClient.js` and `api/*.js` (safe — public, protected by RLS).

## Database

Run the `supabase_*.sql` migrations in the Supabase SQL Editor **in the order listed in CLAUDE.md**.
All DB calls **degrade gracefully** if a column/table/RPC is missing, so the app keeps working before
each migration is run.
