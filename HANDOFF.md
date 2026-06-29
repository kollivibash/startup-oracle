# Startup Oracle — Session Handoff

**Paste this whole file into a new chat to continue seamlessly.** It's the current,
complete state. `CLAUDE.md` is the architecture deep-dive; this is the "where we are
+ what's next" brief.

---

## WHAT IT IS
Startup validation platform + LinkedIn-style founder community. Founders submit an
idea → AI-generated **6-section deep-dive report**. The community lets them post ideas
(audience picker: Everyone / Followers / Only me), follow each other (approval-based),
rate posts 1–10, comment, repost, DM (rich realtime), edit posts after posting,
full-screen search, and (when billing is on) subscribe for a Verified Founder badge.

## REPO / RUN / LIVE
- **Root:** `/Users/kollivibash/startup-oracle` (git, branch `main`)
- **Live:** https://startup-oracle-seven.vercel.app (Vercel auto-deploys on push to `main`)
- `npm run dev` → http://localhost:5173. **`/api/*` does NOT run under vite dev** — only
  on Vercel or `npx vercel dev`. The community feed DOES work in dev (talks to Supabase).
- `npm run build` ; `npx eslint src/<file>` to lint. **No test suite** — verify in
  browser/preview tools.
- `CLAUDE.md` in the repo is the source of truth — read it first; it's current.
- **Latest commit: `9f68ff0`. Everything is committed + pushed + live.**

## STACK
React 19 + Vite (rolldown). **Inline styles everywhere** EXCEPT `MasterReport.jsx`
(Tailwind v4) + the token layer in `src/index.css`. Supabase (auth/Postgres+RLS/storage/
realtime). AI = Google **Gemini 2.5-flash** via serverless `api/generate.js` (key
server-side `GEMINI_API_KEY` — **NEVER** `VITE_` prefix). Payments = Razorpay (**DORMANT**
until domain bought). **No React Router** — `App.jsx` switches views via `setView()`:
oracle(home)/submit/community/account/pricing/auth/report/terms/privacy. Heavy views are
`React.lazy` code-split. App is wrapped in an `ErrorBoundary` + shows an offline banner.

---

## DONE THIS SESSION (all committed + pushed + live)
Worked a **10-ticket QA audit** (from a tester PDF) + extra fixes. Commits, newest first:
- `9f68ff0` **Real account deletion** — `api/delete-account.js` (service-role) deletes the
  caller's auth user → cascades to profile/posts/follows/messages → **gone from search**.
  The old in-app delete was fake (logout + clear localStorage only). Needs
  `SUPABASE_SERVICE_ROLE_KEY` in Vercel (**owner set it this session; verified live 401**).
- `fe4ad1b` **BUG-001 Mobile pass** — `index.css` `html,body{overflow-x:clip;max-width:100%}`
  kills the horizontal scroll / zoom-out (renders at true device width); community header
  fits on phones (CTA collapses to `✦`, search flexes, bottom nav spans viewport); Home
  padding fluid via `clamp()`. **Core overflow fixed; deeper per-screen polish wants a real device.**
- `fe5de3a` **BUG-006 Full-screen search overlay** — opens on search focus (portaled to
  `<body>`), live **People + Ideas** results, **recent-people history** (last 10 in
  localStorage, clear-all + per-item ✕), topic suggestions.
- `9e6d0ab` **BUG-009 Private follower/following lists** — only the owner or an accepted
  follower can open the lists (counts + "Followed by X" stay public). Client gate +
  `SECURITY DEFINER` RPC `get_follow_list` (`supabase_follow_list_privacy.sql`).
- `7eff271` **BUG-007 DM message requests** (CRITICAL) — a non-follower can send only **one**
  message until the recipient replies/follows. Client gate (handleSend/ChatArea) + a
  `BEFORE INSERT` trigger (`supabase_dm_message_request.sql`).
- `e7876d1` **QA quick fixes** — BUG-004 native share sheet (`navigator.share` → copy
  fallback), BUG-003 chat-bubble Messages icon, BUG-002 onboarding card no longer flashes
  (waits for profile+feed load), BUG-010 unfollow confirmation dialog.
- `3f5c7bf` Top-right avatar → dropdown menu (View profile / Account & ideas / Sign out).
- `9ea4c4e` Lightbox portaled to `<body>` so it opens truly fullscreen.
- `185990b` Sidebar **Following list** (clickable stats) + real **people search**
  (searchProfiles queries the profiles table); richer **media grid + lightbox**.
- `5305d8d` LinkedIn-style **Role + Company** profile fields; dropped the misleading
  hardcoded "Founder · Startup Oracle" subtitle default.
- `66701d9` Per-conversation **Clear chat / Delete chat** in the DM header.

**BUG-008 (profile edit "exposed") = NOT a real bug** — edit is already gated (`editing`
defaults `false`; the "+ Add About/Experience" items are read-only CTAs, not live inputs).

(Prior sessions: full 5-phase India-launch QA audit, WelcomeSlides onboarding, post
audience/visibility — see `git log` + `CLAUDE.md`.)

## ⚠️ PENDING OWNER ACTIONS (code is live; these activate it — all degrade gracefully)
Run these **in Supabase SQL Editor** (idempotent, safe to re-run):
1. ⚠️ **`supabase_post_visibility.sql`** — HIGHEST. Until run, "Only me"/"Followers" don't
   hide posts and post-editing fails. (Confirmed unrun on live in a prior session.)
2. **`supabase_profile_role.sql`** — Role/Company persist on save.
3. **`supabase_community_hardening.sql`** — DM/reaction/upload hardening.
4. **`supabase_dm_message_request.sql`** — server-enforce the one-message rule (BUG-007).
5. **`supabase_follow_list_privacy.sql`** — server-enforce private lists (BUG-009).
6. **`supabase_realtime_community.sql`** — if live feed/bell don't auto-update, this is unrun.

Vercel env / external:
7. ✅ **`SUPABASE_SERVICE_ROLE_KEY`** — set this session (account deletion now real + verified).
8. **`REPORT_GRANT_SECRET`** (any random string) — activates the report quota-bypass fix.
9. ⚠️ **`GEMINI_API_KEY`** — the current key's Google project is **blocked** (reports fail with
   `403 PERMISSION_DENIED` — "project has been denied access"). The owner's Google account is
   in verification. Fix: generate a **fresh key under a NEW Google Cloud project** at
   aistudio.google.com → update `GEMINI_API_KEY` in Vercel (Prod+Preview) → redeploy.
10. Enable Supabase **Phone auth + an SMS provider** to switch on phone/OTP login.
11. Re-run **`supabase_billing.sql`** + add Razorpay env vars only when enabling billing.

## OTHER PENDING WORK
- **WEBSITE RENAME:** owner wants to change "Startup Oracle" but has **NOT chosen a name**.
  DO NOT suggest names unless asked. When chosen, `grep -ri "startup oracle"` across `src/`,
  `api/`, `index.html` and rename: the wordmark in `Home.jsx` (Cormorant serif), `Auth.jsx`,
  `Legal.jsx`, `WelcomeSlides.jsx`; the share text in `Community.jsx`; `index.html`
  title+meta; `package.json`; `README.md`; `CLAUDE.md`.
- **BUG-005** (LOW, the only open QA ticket): a dropdown opens downward and clips near the
  screen bottom; needs the owner to say **which menu** (post `⋯` menu? composer audience
  picker?). Then add drop-up boundary detection.
- **Mobile (BUG-001) deeper polish** — per-screen pixel work, best finished on a real phone.
- Fill the **`[BRACKET]` placeholders** in `src/Legal.jsx` (company/contact/grievance
  officer/jurisdiction) before launch — template values, not legal advice.
- OPTIONAL: fire post-signup WelcomeSlides for Google/GitHub/phone signups too (currently
  only email/password sets `localStorage.so_welcome_pending`).

## DELIBERATELY DECIDED — DO NOT UNDO
- Theme = **black & white minimal**; ONLY accent `--accent #2563eb` (focus/active + verified
  badge). Home is intentionally pure editorial B&W.
- Type: **DM Sans** body + **Plus Jakarta Sans** display everywhere; HOME keeps **Cormorant**
  serif hero+wordmark (the ONLY exception). Don't put Cormorant elsewhere or sans on the Home hero.
- Pricing: **NO plan pre-selected** (interactive selection). Don't re-add a hardcoded default.
- Post **reactions/Like REMOVED** (Rate 1–10 is the only post engagement). Do NOT re-add.
- The whole **connections / "My Network" REMOVED** (followers + following only). Do NOT re-add.
- **Billing stays DORMANT** until the domain is bought.

## SUPABASE MIGRATIONS (owner runs manually in SQL Editor, IN THIS ORDER; all degrade gracefully)
community_tables → ideas_table → messages_table → follow_requests → post_media → post_meta →
notifications → engagement → profiles_rich → network → posts_extra → message_media →
realtime_community → billing (only when Razorpay ready) → community_hardening →
post_visibility → profile_role → dm_message_request → follow_list_privacy.
**Likely UNRUN on live:** post_visibility, community_hardening, billing, realtime_community(?),
profile_role, dm_message_request, follow_list_privacy.

## HOW TO WORK (norms — match these exactly)
- **Token-efficient:** grep to locate, read targeted line windows (not whole 3000-line files),
  surgical edits, build/lint ONCE per logical batch.
- **Verify every change:** `npx eslint <files>` + `npm run build`. Browser-verify via preview
  tools when observable (prefer DOM checks via `preview_eval` over screenshots, which can drift
  blank). Full DM/realtime/follow/billing/visibility/deletion features can only be truly tested
  on the deployed site with real signed-in accounts.
- **QA findings:** Exec Summary → Documented Issues Tracker (severity-tagged) → permission gate
  BEFORE writing code.
- **Commit + push to `main` ONLY when the owner asks** ("yes"/"commit"/"push"). Push = production
  deploy. End every commit message with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **New/changed Supabase migration** → give the owner the SQL to copy-paste and remind them it's
  required (code degrades gracefully until run). Keep `CLAUDE.md` updated when architecture/
  migrations/features change.

## KEY FILES
`src/App.jsx` (routing/auth/lazy/ErrorBoundary/offline/welcome), `src/ErrorBoundary.jsx`,
`src/WelcomeSlides.jsx`, `src/Auth.jsx`, `src/Home.jsx`, `src/Legal.jsx`, `src/SubmitIdea.jsx`,
`src/Account.jsx`, `src/Pricing.jsx`, `src/MasterReport.jsx` (Tailwind report + PrintReport),
`src/Community.jsx` (~3000 lines: feed, composer+audience picker, edit modal, DMs+message
requests, profiles+Role/Company, onboarding card, full-screen search overlay, media grid +
portaled lightbox, realtime), `src/communityDB.js`, `src/billingDB.js`, `src/ideasDB.js`,
`src/reportEngine.js`, `src/index.css` (tokens + global CSS + mobile guards + @media print),
`vite.config.js`. `api/*` serverless (Vercel only): generate, start-report, news, unfurl,
delete-account, razorpay-{subscribe,webhook,sync,cancel}.

## REPO HYGIENE
The repo is **clean** — every tracked file is needed (all `supabase_*.sql` are ordered
migrations, all `src/`+`api/` files are used, configs required). `.env.local` and
`.claude/settings.local.json` are gitignored (local secrets/settings, never pushed). No build
artifacts (`dist/`) or temp files are tracked. Nothing to delete.
