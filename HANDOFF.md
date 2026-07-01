# Startup Oracle — Session Handoff

**Paste this whole file into a new chat to continue seamlessly.** It's the current,
complete state. `CLAUDE.md` (in the repo root) is the architecture deep-dive and is also
current — read it first; this is the "where we are + what's next" brief on top of it.

---

## WHAT IT IS
Startup validation platform **+ a two-sided founder↔investor marketplace** built on a
LinkedIn-style community.
- **Validate:** a founder submits an idea → AI-generated **6-section deep-dive report**,
  with an animated score reveal (ring counts up from 0, sub-score bars grow in on mount).
- **Community (founder side):** post ideas (audience picker Everyone / Followers / Only me),
  follow (approval-based), rate 1–10, threaded comments, repost, save, rich realtime DMs,
  edit posts, full-screen search, verified badge (when billing is on). Feed cards fade in
  with a stagger on load.
- **Marketplace:** founders **pitch** ideas — writing a pitch triggers a **mandatory inline
  AI validation** (same engine as the validate flow) before it can post; the resulting
  Oracle Score is mirrored to the founder's public profile so investors can see it.
  Investors browse an open deal-flow of validated pitches, open a founder's deal-page
  (Figma layout) to read the full report, and message the founder — **entirely inside the
  investor surface**, never routed through the founder community.

## THE MARKETPLACE FLOW (all live)
Home **"Build Community"** → a **Gateway** role chooser (`Gateway.jsx`, view `gateway`):

- **Founder** → a required 6-step onboarding (`FounderOnboarding.jsx` → `profiles.founder_profile`,
  gateway-only gate) → the community feed (view `community`). The composer's 4th **"💡 Pitch"**
  mode collects category/stage/amount/equity/website + files, then the primary button is
  **"Validate & publish"**: it runs `generateMasterReport` inline (0–6 progress bar) and only
  posts once a scored report comes back. Closing the composer mid-validation now properly
  aborts the generation and refunds the consumed credit (it used to keep running in the
  background and post anyway — fixed this session, see DONE RECENTLY). The founder's own
  deal-page is reachable from the community sidebar ("My deal page").
- **Investor** → a required 6-step onboarding (`InvestorOnboarding.jsx` → `profiles.investor_profile`)
  → the **deal-flow dashboard** (`Invest.jsx`, view `invest`, anon-browsable): a staggered-in grid
  of pitch cards (`fetchPitches`) with an Oracle Score badge, category filter + search + sort.
  "View deal page →" opens the founder's `FounderProfile` (Oracle Score bar, "View AI Report",
  "Express Interest"); "✦ Message" (or Express Interest) opens `MessageModal.jsx` — a
  self-contained DM overlay. **Investors never get routed into the founder community** — that
  was a real bug (fixed this session, see below) where "View & message" and Express Interest
  both dropped investors into the community feed.

**Account type:** the gateway sets `profiles.account_type` (`founder`|`investor`, switchable —
re-pick at the gateway). Seeded into `localStorage.so_account_type`; persisted to the profile
after login (queued via `so_account_type_pending` when picked while logged out).

## REPO / RUN / LIVE
- **Root:** `/Users/kollivibash/startup-oracle` (git, branch `main`)
- **Live:** https://startup-oracle-seven.vercel.app (Vercel auto-deploys on push to `main`)
- `npm run dev` → http://localhost:5173. **`/api/*` does NOT run under vite dev** — only on
  Vercel or `npx vercel dev`. The community/marketplace DOES work in dev (talks to Supabase
  directly), so feed/deal-flow/animations are all browser-verifiable locally; report
  generation, the pitch AI validation, DM send, and onboarding persistence are NOT (need
  live `/api/generate` and/or a real signed-in account) — verify those via code review +
  lint/build, and say so explicitly rather than claiming a click-test that didn't happen.
- `npm run build` ; `npx eslint src/<file>` (or `npx eslint src/` for everything) to lint.
  **No test suite** — verify in browser/preview.
- **Latest commit: `a9aba89`. Everything is committed + pushed + live.**

## STACK
React 19 + Vite (rolldown). **Inline styles everywhere** EXCEPT `MasterReport.jsx` (Tailwind v4)
+ the design-token layer in `src/index.css`. Supabase (auth / Postgres+RLS / storage / realtime).
AI = Google **Gemini 2.5-flash** via serverless `api/generate.js` (key server-side `GEMINI_API_KEY`
— **NEVER** a `VITE_` prefix). Payments = Razorpay (**DORMANT** until a domain is bought). **No
React Router** — `App.jsx` switches views via `setView()`; heavy views are `React.lazy` code-split;
the app is wrapped in `ErrorBoundary` + an offline banner.

**Views:** `oracle`(home) · `gateway`(founder/investor chooser) · `submit` · `community` ·
`invest`(investor deal-flow, anon-browsable) · `investorProfile`/`investorEdit`/`investorView` ·
`founderView`/`founderEdit` (a founder's deal-page, self or investor-viewed) · `account` ·
`pricing` · `auth` · `report` · `terms` · `privacy`. `sessionStorage.so_view` persists across
reloads; the browser Back button is wired via History API. `dmTarget` state (App.jsx) + a
`<MessageModal/>` rendered at the app root (outside the view switch) is the investor↔founder DM.

---

## DONE RECENTLY (all committed + pushed + live; newest first)
- `a9aba89` **Animation polish pass** (7 additions in one go, user asked for "all at once"):
  MasterReport's Oracle Score ring counts up from 0 + sub-score bars grow in (JS rAF-driven,
  explicitly checks `prefers-reduced-motion` since it's not a CSS transition); Community
  feed + Invest deal-flow cards fade in staggered by index; a shared press/lift micro-
  interaction on primary buttons (SubmitIdea's `Btn`, a new shared `SubmitBtn` in Auth.jsx
  that also de-duplicated 5 near-identical submit buttons, Account's `PrimaryBtn`, Pricing's
  subscribe button); notification badges (bell + mobile) pop on count change; Founder/Investor
  onboarding steps fade+slide in on `step` change; the toast snackbar slides up instead of
  hard-appearing; new DM messages pop in.
- `13c59fd` / `a328683` **Home.jsx rebuild**: the landing page only advertised the founder
  half of the marketplace and had no footer. Added a 3rd "For Investors" card + nav link
  (routes straight into the anon-browsable deal-flow), an animated inline "How it works"
  (scroll-reveal + hover, richer copy naming the 6 report sections), a live pitch preview
  strip (dynamically imports communityDB so it doesn't bloat the eager Home bundle; hides
  itself if there are zero pitches — a sparse section reads worse than none), and a footer
  (Terms/Privacy — must be `target="_blank"`, since App.jsx only reads `#/legal/*` at
  initial mount, not on live hash change — learned this the hard way, see Community's
  Auth.jsx pattern which already did it right).
- `41116fc` **Pitch composer cancel bug (real, reported by owner)**: closing the composer
  (✕/backdrop/Escape/Cancel) during pitch AI validation only unmounted the modal — the
  in-flight `generateMasterReport` call had no `AbortController`, so it kept running and,
  on success, still mirrored the score and published the pitch to investors with nobody
  having approved it. Fixed: `AbortController` + a `cancelledRef` checked after every await,
  refunding the consumed validation credit if cancelled. Also fixed two bugs found while
  in there: `startReport()`'s grant was being passed as the whole `{allowed,reason,grant}`
  object instead of `.grant` (would 403 every pitch validation once `REPORT_GRANT_SECRET`
  is set), and the quota gate (`r.allowed`) was never checked for pitches at all.
- `782cf25` **Investor routing bug (real, reported by owner)**: investors were dropped into
  the founder community feed in three places (a "Founder view" nav button, "View & message"
  deep-linking into community, "Express Interest" opening a DM inside community) — very
  confusing, and meant clicking a founder showed the community profile instead of the Figma
  deal-page. Fixed: investors now stay entirely on `invest` → `founderView` (deal-page) →
  `report`, with messaging via a new self-contained `MessageModal.jsx` instead of ever
  entering the community. Founder→investor DMs are unaffected (the founder is a community
  member, so that side was never the bug).
- `1c2f623` / `6369bde` / `62d9339` / `3b95e34` **Founder-side marketplace parity**: founder
  onboarding (6-step wizard → `founder_profile`), the founder's own deal-page ("My deal page"
  in the community sidebar), and the mandatory-inline-AI-validation pitch flow (see
  CLAUDE.md's pitching paragraph for the full mechanics).
- (Earlier: investor onboarding + deal-flow dashboard + gateway — see `git log` + `CLAUDE.md`.)

## REPO HYGIENE (cleaned up this session)
- Removed 8 dead exports from `communityDB.js`/`billingDB.js` that had zero call sites
  anywhere in `src/`: `reactToPost` + the whole `fetchConnectionState/sendConnect/
  respondConnection/removeConnection/fetchConnectionRequests/fetchConnectionCount/
  fetchConnections` set (backing the "connections/My Network" feature, which CLAUDE.md
  already documented as removed-on-purpose from the UI — the DB-layer functions were just
  never cleaned up until now), and `consumeValidation` in billingDB.js (the old client-only
  quota check, explicitly superseded by the server-authoritative `startReport()`/
  `/api/start-report`). Also dropped one dead `notifText()` branch (`connect_accept`,
  never created by anything). Verified zero remaining references, full lint + build clean,
  smoke-tested the feed still renders.
- Deleted `IMPLEMENTATION_SUMMARY.md` — an untracked, stale scratch doc from a prior session
  that duplicated this file's purpose and described work as "pending" that had long since
  shipped. This file (`HANDOFF.md`) is the one and only session-continuity doc; keep it that
  way (don't let a second one accumulate again).
- The repo is otherwise clean — every tracked file is needed (all `supabase_*.sql` are
  ordered migrations, all `src/`+`api/` files are used). `.env.local` and
  `.claude/settings.local.json` are gitignored. `.claude/launch.json` defines the `dev`
  preview server.

## ⚠️ PENDING OWNER ACTIONS (code is live; these activate it — all degrade gracefully)
**Run in Supabase SQL Editor** (idempotent, safe to re-run), in this order — see CLAUDE.md's
full numbered list (1–22) for the complete history. The newest three:
- `supabase_account_type.sql` — `profiles.account_type` for the gateway.
- `supabase_investor_profile.sql` — `profiles.investor_profile` (jsonb) for onboarding.
- `supabase_founder_profile.sql` — `profiles.founder_profile` (jsonb) for founder onboarding
  + the Oracle Score/report mirror. **Until this runs, a pitch's Oracle Score won't persist
  on the founder's deal-page across sessions** (though the pitch itself still posts fine).

**Vercel env / external — last known status, VERIFY, don't assume:**
- **`GEMINI_API_KEY`** — as of the last time this was checked, the Google Cloud project's
  key was returning `403 PERMISSION_DENIED` (blocked/quota issue). Without a working key,
  every "Validate & publish" / "Analyse Idea" fails. **Nothing this session touched this —
  verify it's actually working before assuming reports/pitches work end-to-end on the live
  site.** Fix if still broken: fresh key under a new Google Cloud project at
  aistudio.google.com → set `GEMINI_API_KEY` in Vercel (Prod+Preview) → redeploy.
- `REPORT_GRANT_SECRET` (any random string) — not yet set as far as this session knows;
  activates the report-grant paywall-bypass fix. The pitch flow's grant-passing bug (see
  DONE RECENTLY, `41116fc`) is now fixed, so it's safe to turn this on whenever the owner
  wants — it would have silently broken all pitch validation before that fix.
- `SUPABASE_SERVICE_ROLE_KEY` — was set as of the last handoff (account deletion works).
- Supabase phone auth + SMS provider — not configured (phone/OTP sign-in shows "not
  available yet").
- `supabase_billing.sql` + Razorpay env vars — only when enabling billing (intentionally
  dormant until the owner buys a domain).

## OTHER PENDING / OPTIONAL WORK
- **Not click-tested this session** (needs live Gemini + a real signed-in account, neither
  available in this sandbox): the Oracle Score ring's count-up animation, the founder/investor
  onboarding step-transition animations, and the DM message pop-in. All verified via lint +
  build + code review + reusing patterns already proven correct elsewhere (Home's reveal),
  but worth a real click-test on the live site.
- **Home.jsx**: deliberately did NOT add a numeric stats bar (founders/investors/pitches
  count) — real counts are low enough right now that a literal number would hurt credibility
  more than help. Revisit once there's real traction. Also held off on a report-preview
  screenshot and an FAQ section — both need copy/content decisions from the owner.
- **Phase 3 marketplace** (not started): in-dashboard investor "Messages" inbox (right now
  `MessageModal` has no history browser outside the pitch/deal-page it was opened from —
  reopening from the same pitch does reload full history, there's just no standalone list),
  shortlist/saved pitches, "an investor viewed/saved your pitch" notification.
- **WEBSITE RENAME:** owner wants to rename "Startup Oracle" but has **NOT chosen a name**.
  Do NOT suggest names unless asked. When chosen: `grep -ri "startup oracle"` across `src/`,
  `api/`, `index.html` and rename the wordmark (Home/Gateway/Invest/InvestorOnboarding/Auth/
  Legal/WelcomeSlides — Cormorant serif), Community's share text, `index.html` title+meta,
  `package.json`, `README.md`, `CLAUDE.md`.
- Fill the **`[BRACKET]` placeholders** in `src/Legal.jsx` before launch.

## DELIBERATELY DECIDED — DO NOT UNDO
- Theme = **black & white minimal**; ONLY accent `--accent #2563eb` (focus/active + verified
  badge + pitch "raising" pills). Home is intentionally pure editorial B&W — even the new
  investor card/live-pitch strip stay monochrome, no blue creeping in.
- Type: **DM Sans** body + **Plus Jakarta Sans** display everywhere; **Cormorant** serif is
  the wordmark/Home-hero ONLY exception.
- **Pitch = `kind:'pitch'` post** (reuses `community_posts` meta/media) — do NOT make a
  separate table.
- **Investors never enter the founder community** — deal-flow → deal-page → report → DM
  modal is a closed loop. Don't reintroduce a "View & message" link that deep-links into
  `community` for investors (that was the bug fixed in `782cf25`).
- Pricing: **NO plan pre-selected**. Post **reactions/Like REMOVED** (Rate 1–10 only) — and
  now the dead `reactToPost` code backing it is gone too, not just the UI. The whole
  **connections / "My Network" REMOVED** — same, DB-layer code is now gone too.
  **Don't re-add either without the owner asking** — if you need a fresh start you'd write
  new functions, not resurrect the deleted ones from git history.
  **Billing stays DORMANT** until the domain is bought.
- Home's live pitch/founder-preview sections **hide themselves entirely when there's no
  real data** rather than showing an empty/sparse state — keep this pattern for any future
  "live content" additions to landing-type pages.

## SUPABASE MIGRATIONS — run manually in SQL Editor, IN THIS ORDER (all degrade gracefully)
community_tables → ideas_table → messages_table → follow_requests → post_media → post_meta →
notifications → engagement → profiles_rich → network → posts_extra → message_media →
realtime_community → billing (only when Razorpay ready) → community_hardening → post_visibility →
profile_role → dm_message_request → follow_list_privacy → account_type → investor_profile →
**founder_profile** (newest — see PENDING OWNER ACTIONS above).

## HOW TO WORK (norms — match these exactly)
- **Verify every change:** `npx eslint <files>` + `npm run build`, every time, before calling
  something done. Browser-verify with the preview tools (`preview_start`/`preview_eval`/
  `preview_console_logs`/`preview_screenshot`) when the change is observable in the running
  dev server — the feed, deal-flow, Home, and any pure-CSS/animation work all qualify since
  `/api/*` isn't needed. Report generation, live pitch validation, DM send/receive, and
  onboarding persistence need a real signed-in account + live Gemini — say explicitly when
  something was verified by code review only, not click-tested, and why.
- **This specific preview harness reports `document.hidden = true`** (tab not focused/visible
  from the automation's perspective) — Chrome pauses/throttles CSS `@keyframes` animation
  timelines in that state (confirmed via the Web Animations API: `currentTime` stays frozen
  at 0). CSS `transition`s are NOT affected the same way. If a keyframe animation looks stuck
  when checking `getComputedStyle(...).opacity` mid-animation, don't assume it's broken —
  force it via `el.getAnimations()[0].finish()` and confirm it lands on the correct end state;
  that's the real test in this environment. Scroll position (`window.scrollY`/`scrollTo`) is
  also unreliable across *separate* `preview_eval` calls in this harness (works fine within
  one continuous eval call, or after a genuinely fresh navigation via
  `window.location.href = origin + '/?fresh=' + Date.now()` rather than `location.reload()`,
  which can inherit scroll-restoration from a prior reload in the same tab).
- **Use TaskCreate/TaskUpdate to track multi-step work** — mark `in_progress` before starting
  a step, `completed` right after, delete stale tasks from earlier asks rather than leaving
  them around. Works well for "do all N things then verify" requests.
- **Permission gate before code** for anything new; **commit + push to `main` ONLY when the
  owner asks** ("commit and push", "push everything", etc.) — this has been the pattern every
  time this session: build → verify → wait for the explicit go-ahead → `git add` the specific
  touched files (never `-A`/`.` — check `git status`/`git diff --stat` first, there's
  sometimes an unrelated untracked file sitting around that isn't part of the current work)
  → commit with a message ending `Co-Authored-By: Claude <model-name> <noreply@anthropic.com>`
  (match whichever model you're actually running as — this session used Sonnet 5 for most
  work, Opus 4.8 for one bug-fix exchange) → push → report the commit hash/link back.
- **New/changed Supabase migration** → give the owner the SQL to copy-paste and remind them
  it's required (code degrades gracefully until run). Keep `CLAUDE.md` updated when
  architecture changes — it's the deep-reference doc read automatically every session; this
  one (HANDOFF.md) is the lighter "state + what's next" layer on top, update both together.
- **For exploratory "give me ideas" asks:** respond with a ranked, concrete, codebase-grounded
  list (not a 2-sentence brush-off, not a vague essay) and end by asking which to start with
  or offering to just start with the top pick. This session's Home-page-ideas exchange and the
  animation-ideas exchange both worked well this way — the user then often just says "start
  building" / "complete all picks at once," so be ready to execute the whole list, not just
  the first item, when they give that kind of blanket go-ahead.

## KEY FILES
`src/App.jsx` (routing/auth/lazy/ErrorBoundary/offline/welcome/role+onboarding gating/
`dmTarget`+`<MessageModal/>` at the root), `src/Home.jsx` (landing — see DONE RECENTLY),
`src/Gateway.jsx` (founder/investor chooser), `src/Invest.jsx` (deal-flow dashboard),
`src/MessageModal.jsx` (investor↔founder DM overlay), `src/InvestorOnboarding.jsx` /
`src/FounderOnboarding.jsx` (6-step wizards, animated step transitions),
`src/InvestorProfile.jsx` / `src/FounderProfile.jsx` (self + investor/founder-facing deal
pages), `src/Community.jsx` (~3200 lines: feed w/ stagger, composer incl. 💡 Pitch mode +
mandatory inline validation, edit modal, DMs+message requests, profiles, onboarding card,
search overlay, media+lightbox, realtime, animated toast/badges/messages),
`src/communityDB.js` (all community/marketplace queries incl. `fetchPitches`,
`get/setAccountType`, `get/save{Investor,Founder}Profile`, `setFounderAiReport` — cleaned of
dead connections/reactions exports this session), `src/Auth.jsx` (shared `SubmitBtn`),
`src/Account.jsx`, `src/Pricing.jsx`, `src/MasterReport.jsx` (Tailwind report + PrintReport +
animated score reveal), `src/reportEngine.js`, `src/billingDB.js` (cleaned of dead
`consumeValidation` this session), `src/ideasDB.js`, `src/index.css` (tokens + global CSS +
`.sr-only` + mobile guards + @media print + reduced-motion), `vite.config.js`. `api/*`
serverless (Vercel only): generate, start-report, news, unfurl, delete-account,
razorpay-{subscribe,webhook,sync,cancel}.
