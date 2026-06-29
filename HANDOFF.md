# Startup Oracle — Session Handoff

**Paste this whole file into a new chat to continue seamlessly.** It's the current,
complete state. `CLAUDE.md` (in the repo root) is the architecture deep-dive and is also
current — read it first; this is the "where we are + what's next" brief on top of it.

---

## WHAT IT IS
Startup validation platform **+ a two-sided founder↔investor marketplace** built on a
LinkedIn-style community.
- **Validate:** a founder submits an idea → AI-generated **6-section deep-dive report**.
- **Community (founder side):** post ideas (audience picker Everyone / Followers / Only me),
  follow (approval-based), rate 1–10, threaded comments, repost, save, rich realtime DMs,
  edit posts, full-screen search, verified badge (when billing is on).
- **Marketplace (NEW):** founders **pitch** ideas (deck/docs/prototype + amount raising);
  **investors** browse a deal-flow of pitches, filter, and message founders.

## THE MARKETPLACE FLOW (the last few sessions' work — all live)
Home **"Build Community"** → a **Gateway** role chooser (`Gateway.jsx`, view `gateway`):

- **Founder** → the community feed (view `community`). The composer has a 4th **"💡 Pitch"**
  mode: a structured form (category, stage, **amount seeking**, equity, website) on top of the
  existing file uploader. A pitch is saved as a `community_posts` row with `kind:'pitch'` and
  its fields in the `meta` jsonb — so it reuses posts' media/RLS/realtime, renders a "seeking
  investment" banner in the feed, AND shows in the investor dashboard. No new pitch table.
- **Investor** → a **required 6-step onboarding** (`InvestorOnboarding.jsx`), then the
  **deal-flow dashboard** (`Invest.jsx`, view `invest`): grid of pitch cards (`fetchPitches`),
  category filter chips + search + sort, "View & message →" deep-links into the community feed
  focused on that pitch (where the DM button lives).

**Account type:** the gateway sets `profiles.account_type` (`founder`|`investor`, switchable —
re-pick at the gateway). Seeded into `localStorage.so_account_type`; persisted to the profile
after login (queued via `so_account_type_pending` when picked while logged out). The gateway
highlights the saved role ("Your role").

**Investor onboarding** (`InvestorOnboarding.jsx`) — 6 steps, ported from the owner's Lovable
mockups into our B&W design system:
1. **About you** — full name*, firm/fund, location*, LinkedIn, website  *(Title field was removed)*
2. **Credentials** — years investing, background, AUM, companies backed, notable exits
3. **How you invest** — investor type, ticket, follow-on, stages, lead/follow, decision speed
4. **Where you focus** — sectors, business models, geographies, deal-breakers
5. **How you help** — what you bring beyond capital, post-investment involvement, board seats, approach
6. **Your thesis** — investing thesis + what you don't invest in → **Create profile**

Owner decisions baked in:
- **Only `Full name` + `Location` are required** (Step 1). Everything else on every step is
  optional — Continue is enabled by default on Steps 2–6.
- **Option groups are dropdowns to save space** (the owner asked twice): single-choice groups
  (years/ticket/AUM/board seats/…) are native `<select>` dropdowns; multi-choice groups
  (background/sectors/stages/geographies/business models/deal-breakers/…) are **multi-select
  dropdowns** — a checkbox popover whose button shows a compact summary (e.g. "Fintech, SaaS +2").
  **No chip rows below the control** (those were removed because they re-created the pill clutter).
- **Required, no-skip gating:** a signed-in investor MUST finish onboarding before the dashboard
  renders. `App.jsx` gates the `invest` view on `getInvestorProfile` (+ a `localStorage`
  `so_investor_onboarded` fallback) and shows the spinner while checking, so the dashboard never
  flashes. Answers save to `profiles.investor_profile` (jsonb) via `saveInvestorProfile`
  (also mirrors name/firm → profile name/company).

## REPO / RUN / LIVE
- **Root:** `/Users/kollivibash/startup-oracle` (git, branch `main`)
- **Live:** https://startup-oracle-seven.vercel.app (Vercel auto-deploys on push to `main`)
- `npm run dev` → http://localhost:5173. **`/api/*` does NOT run under vite dev** — only on
  Vercel or `npx vercel dev`. The community/marketplace DOES work in dev (talks to Supabase).
- `npm run build` ; `npx eslint src/<file>` to lint. **No test suite** — verify in browser/preview.
- **Latest commit: `3261818`. Everything is committed + pushed + live.**

## STACK
React 19 + Vite (rolldown). **Inline styles everywhere** EXCEPT `MasterReport.jsx` (Tailwind v4)
+ the design-token layer in `src/index.css`. Supabase (auth / Postgres+RLS / storage / realtime).
AI = Google **Gemini 2.5-flash** via serverless `api/generate.js` (key server-side `GEMINI_API_KEY`
— **NEVER** a `VITE_` prefix). Payments = Razorpay (**DORMANT** until a domain is bought). **No
React Router** — `App.jsx` switches views via `setView()`; heavy views are `React.lazy` code-split;
the app is wrapped in `ErrorBoundary` + an offline banner.

**Views:** `oracle`(home) · `gateway`(founder/investor chooser) · `submit` · `community` ·
`invest`(investor dashboard, gated behind investor onboarding) · `account` · `pricing` · `auth` ·
`report` · `terms` · `privacy`. `sessionStorage.so_view` persists across reloads; the browser Back
button is wired via History API.

---

## DONE RECENTLY (all committed + pushed + live; newest first)
- `3261818` Investor onboarding: **only name + location required**; removed the Title field.
- `8c558d1` Investor onboarding: **multi-selects are compact dropdowns** (removed selected-chip rows).
- `9e60979` **Investor onboarding** — required 6-step wizard after "Continue as Investor".
- `d5b524b` **Redesign Phase 1+2 UI** (gateway, pitch composer, investor dashboard) + accessibility
  (semantic headings, real focusable controls, `aria-pressed`/`aria-required`/`aria-label`/`aria-live`,
  a `.sr-only` utility in index.css, higher-contrast muted text).
- `2fa7ff4` **Marketplace Phase 1+2** — Founder/Investor gateway + pitch composer + deal-flow dashboard.
- `bf05096` Added the first HANDOFF.md (now superseded by this version).
- (Earlier: real account deletion, mobile pass, full-screen search, private follow lists, DM message
  requests, the 5-phase India-launch QA audit — see `git log` + `CLAUDE.md`.)

## ⚠️ PENDING OWNER ACTIONS (code is live; these activate it — all degrade gracefully)
**Run in Supabase SQL Editor** (idempotent, safe to re-run). The two NEW marketplace ones:
1. **`supabase_account_type.sql`** — `profiles.account_type` + an index on `community_posts(kind)`.
   Until run: everyone is treated as a founder (role won't persist), but pitching still works.
2. **`supabase_investor_profile.sql`** — `profiles.investor_profile` (jsonb) for onboarding answers.
   Until run: onboarding works in-session (a localStorage flag remembers completion) but doesn't
   persist across devices.

Older migrations likely still UNRUN on live (from prior sessions): `post_visibility`,
`community_hardening`, `dm_message_request`, `follow_list_privacy`, `profile_role`,
`realtime_community(?)`. (See the full ordered list below.)

**Vercel env / external:**
3. ✅ `SUPABASE_SERVICE_ROLE_KEY` — set (account deletion is real + verified).
4. `REPORT_GRANT_SECRET` (any random string) — activates the report quota-bypass fix.
5. ⚠️ **`GEMINI_API_KEY`** — the current key's Google project is **blocked** (reports fail with
   `403 PERMISSION_DENIED`). Fix: make a fresh key under a **new Google Cloud project** at
   aistudio.google.com → set `GEMINI_API_KEY` in Vercel (Prod+Preview) → redeploy.
6. Supabase **Phone auth + SMS provider** to switch on phone/OTP login.
7. `supabase_billing.sql` + Razorpay env vars — only when enabling billing.

## OTHER PENDING / OPTIONAL WORK
- **Surface investor profile data** (firm / ticket / thesis) on the investor's profile, and/or a
  founder-facing "who viewed/saved your pitch". (Owner hasn't asked yet — offer, don't assume.)
- **Phase 3 marketplace:** in-dashboard messaging (so investors message without bouncing to the
  feed), shortlist/saved pitches in the dashboard, "an investor saved your pitch" notification.
- The in-feed **pitch card** banner is functional but lighter-touch than the dashboard cards —
  could get the same polish.
- **WEBSITE RENAME:** owner wants to rename "Startup Oracle" but has **NOT chosen a name**. Do NOT
  suggest names unless asked. When chosen, `grep -ri "startup oracle"` across `src/`, `api/`,
  `index.html` and rename: the wordmark in `Home.jsx`/`Gateway.jsx`/`Invest.jsx`/`InvestorOnboarding.jsx`
  (Cormorant serif) + `Auth.jsx` + `Legal.jsx` + `WelcomeSlides.jsx`; the share text in `Community.jsx`;
  `index.html` title+meta; `package.json`; `README.md`; `CLAUDE.md`.
- Fill the **`[BRACKET]` placeholders** in `src/Legal.jsx` before launch.
- **BUG-005** (LOW, only open QA ticket): a dropdown clips near the screen bottom; owner must say
  WHICH menu before a drop-up fix.

## DELIBERATELY DECIDED — DO NOT UNDO
- Theme = **black & white minimal**; ONLY accent `--accent #2563eb` (focus/active + verified badge +
  pitch "raising" pills). Home is intentionally pure editorial B&W.
- Type: **DM Sans** body + **Plus Jakarta Sans** display everywhere; **Cormorant** serif is the
  wordmark/Home-hero ONLY exception. Don't put Cormorant elsewhere.
- **Pitch = `kind:'pitch'` post** (reuses `community_posts` meta/media) — do NOT make a separate table.
- Investor onboarding: **only name+location required**; option groups are **dropdowns** (multi =
  checkbox dropdown, no chip rows); **required-no-skip** before the dashboard.
- Pricing: **NO plan pre-selected**. Post **reactions/Like REMOVED** (Rate 1–10 is the only post
  engagement). The whole **connections / "My Network" REMOVED** (followers + following only).
- **Billing stays DORMANT** until the domain is bought.

## SUPABASE MIGRATIONS — run manually in SQL Editor, IN THIS ORDER (all degrade gracefully)
community_tables → ideas_table → messages_table → follow_requests → post_media → post_meta →
notifications → engagement → profiles_rich → network → posts_extra → message_media →
realtime_community → billing (only when Razorpay ready) → community_hardening → post_visibility →
profile_role → dm_message_request → follow_list_privacy → **account_type** → **investor_profile**.

## HOW TO WORK (norms — match these exactly)
- **Token-efficient:** grep to locate, read targeted line windows (not whole 3000-line files),
  surgical edits, build/lint ONCE per logical batch.
- **Verify every change:** `npx eslint <files>` + `npm run build`. Browser-verify with the preview
  tools when observable. To preview a gated/auth-only screen, temporarily relax the gate (e.g.
  `else if (true)` in App.jsx's invest branch, and/or `useState(<stepIndex>)` in InvestorOnboarding),
  screenshot, then **revert the temp edits** before committing. Full DM/realtime/follow/billing/
  onboarding-persist features can only be truly tested on the deployed site with real accounts.
- **Permission gate before code** for anything new; **commit + push to `main` ONLY when the owner
  asks** ("yes"/"commit"/"push"). Push = production deploy. End every commit message with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **New/changed Supabase migration** → give the owner the SQL to copy-paste and remind them it's
  required (code degrades gracefully until run). Keep `CLAUDE.md` updated when architecture changes.

## KEY FILES
`src/App.jsx` (routing/auth/lazy/ErrorBoundary/offline/welcome/role+onboarding gating),
`src/Home.jsx` (landing; "Build Community" → gateway), `src/Gateway.jsx` (founder/investor chooser),
`src/Invest.jsx` (deal-flow dashboard), `src/InvestorOnboarding.jsx` (6-step wizard),
`src/Community.jsx` (~3000 lines: feed, composer incl. 💡 Pitch mode, edit modal, DMs+message
requests, profiles, onboarding card, search overlay, media+lightbox, realtime),
`src/communityDB.js` (all community/marketplace queries incl. `fetchPitches`, `get/setAccountType`,
`get/saveInvestorProfile`), `src/Auth.jsx`, `src/Account.jsx`, `src/Pricing.jsx`,
`src/MasterReport.jsx` (Tailwind report + PrintReport), `src/reportEngine.js`, `src/billingDB.js`,
`src/ideasDB.js`, `src/index.css` (tokens + global CSS + `.sr-only` + mobile guards + @media print),
`vite.config.js`. `api/*` serverless (Vercel only): generate, start-report, news, unfurl,
delete-account, razorpay-{subscribe,webhook,sync,cancel}.

## REPO HYGIENE
The repo is clean — every tracked file is needed (all `supabase_*.sql` are ordered migrations, all
`src/`+`api/` files are used). `.env.local` and `.claude/settings.local.json` are gitignored. No
build artifacts or temp files tracked. `.claude/launch.json` defines the `dev` preview server.
