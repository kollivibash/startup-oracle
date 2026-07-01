# Startup Oracle

Startup validation platform **+ a two-sided founder↔investor marketplace**: founders submit ideas
and get an AI-generated 6-section deep-dive report, share them in a LinkedIn-style community (follow,
rate, comment, repost, DM), and **pitch to investors**; investors browse a deal-flow of pitches and
message founders. Plus (when billing is switched on) subscribe for a Verified Founder badge.

**Founder/Investor gateway:** clicking "Build Community" on Home opens a role chooser (`gateway` view).
Founder → the community feed; Investor → the deal-flow dashboard (`invest` view, `Invest.jsx`). The
choice is saved on `profiles.account_type` (`founder`|`investor`, switchable — re-pick at the gateway),
seeded into `localStorage.so_account_type` and persisted after login (queued via `so_account_type_pending`
when picked while logged out). A **pitch** is a `community_posts` row with `kind:'pitch'` and structured
fields in `meta` (`{ pitch, category, stage, amount, equity, website, aiScore, aiReportId }`) + uploaded
files in `media` — it shows in BOTH the founder feed and the investor dashboard. Pitches are open
deal-flow (every pitch visible to all investors). The composer has a 4th "💡 Pitch" mode.
**Pitching requires an AI analysis (runs inline):** in the 💡 Pitch composer the founder writes the
pitch, then the primary button is **"Validate & publish"** — clicking it runs `generateMasterReport`
on the pitch (via `startReport` for the grant/quota, same engine as SubmitIdea) with a 0–6 progress
bar, and only posts once a scored report comes back (no validation → no pitch — and closing the
composer mid-validation properly aborts the in-flight generation + refunds the consumed validation
credit, via an AbortController + a cancelled-ref checked at every step before the mirror/post; it
used to keep running in the background and post anyway). The resulting Oracle
Score + a report snapshot are mirrored onto the (public) `profiles.founder_profile` via
`setFounderAiReport` (and `saveIdea` keeps it in the founder's account), so investors — who CAN'T read
the owner-only `ideas` table — see the Oracle Score (deal-flow card badge + deal-page sidebar) and open
the full AI report from the founder's deal-page (the shared MasterReport, returning via
`reportReturnView`). The pitch `meta` carries `aiScore`. Needs a working `GEMINI_API_KEY`.
`fetchPitches()` powers the dashboard.
Picking Investor first runs a **required 6-step onboarding** (`InvestorOnboarding.jsx`, saved to
`profiles.investor_profile`); the `invest` dashboard is gated until it's completed.
Picking **Founder** at the gateway likewise runs a **required 6-step onboarding** (`FounderOnboarding.jsx`,
saved to `profiles.founder_profile`) before the community feed renders — **gateway-only**: it's gated
via a `localStorage.so_founder_onboard_due` flag set in `chooseRole('founder')`, so founders who reach
the community another way (or anonymously) are NOT blocked. saveFounderProfile also mirrors
name/startup→company/role/tagline→bio/location onto the profile.

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

**Optional** `REPORT_GRANT_SECRET` (any random string) — when set, `/api/generate` requires a signed
report grant from `/api/start-report`, which closes the client-only-paywall bypass (a signed-in user
calling `/api/generate` directly to burn the Gemini bill). Until it's set, generate works ungated
(degrades gracefully, like dormant billing). Set it alongside enabling billing.

> **`/api/*` only runs on the deployed Vercel site, NOT in `npm run dev`** (Vite doesn't serve
> serverless functions). So report generation, live news, link previews, and Razorpay don't work
> locally — every caller degrades gracefully (fails open / shows fallback). Use `npx vercel dev`
> if you need `/api` locally.

## Architecture

Single-page React (Vite). No React Router — `App.jsx` switches views via `setView()`. Views:
`oracle` (Home), `gateway` (Founder/Investor chooser), `submit`, `community`, `invest` (investor
deal-flow), `account`, `pricing`, `auth`, `report`, `terms`, `privacy`. `sessionStorage.so_view`
persists across reloads; the **browser Back button** is wired to the view via History API
(`pushState`/`popstate`) so Back returns to the previous view.

Styling is **inline styles** everywhere except `MasterReport.jsx`, which uses **Tailwind v4**
(`@tailwindcss/vite`, `@import "tailwindcss"` in `index.css`).

### File Map

```
src/
  App.jsx          — routing, auth state, OAuth hash handling, browser-back history sync; wraps the
                     app in `ErrorBoundary` + shows an offline banner (navigator.onLine)
  ErrorBoundary.jsx— class error boundary so a render crash shows a recover screen, not a white page
                     (mounted in main.jsx around <App/>, and per-view in App.jsx keyed by `view`)
  WelcomeSlides.jsx— first-run 3-slide intro carousel (Validate / Community / Free to start); shown once
                     on first visit + once after signup (localStorage `so_welcome_seen`/`so_welcome_pending`),
                     replayable via Home's "How it works" link. Distinct from the in-feed OnboardingCard.
  Home.jsx         — landing: serif hero (CTAs "Build Community" → gateway, "Analyse Idea", "Pricing"),
                     a 3-card split (Community / Analyse Idea / **For Investors** → `invest`, anon,
                     no auth gate), an animated 3-step "How it works" (scroll-reveal + hover, see
                     Design System), a live "What founders are building" strip (dynamically imports
                     communityDB to fetch real pitches — hidden entirely if there are none, on
                     purpose: an empty/sparse stats-style section reads worse than no section), and a
                     footer (Terms/Privacy — `target="_blank"`, since `#/legal/*` hash routes are only
                     read by App.jsx at initial mount, not on live hash change).
  Gateway.jsx      — Founder/Investor role chooser shown after "Build Community"; sets account_type and
                     routes Founder→community / Investor→invest. Doubles as the role switcher.
  Invest.jsx       — investor deal-flow dashboard (`invest` view): grid of pitch cards (fetchPitches,
                     staggered fade-in), category filter chips + search, "View deal page →" opens the
                     founder's FounderProfile deal-page (NOT the community), "✦ Message" opens
                     MessageModal.jsx. Anon-browsable.
  MessageModal.jsx — self-contained investor↔founder DM overlay (a modal, not a view): lets an investor
                     message a founder without ever being routed into the founder community feed.
                     Reuses the `messages` table + realtime from communityDB (fetchConversations/
                     sendMessage/subscribeToMessages) and mirrors the BUG-007 message-request rule
                     (one message until the other side replies). Opened via App.jsx's `openDealDM`
                     (auth-gated: sends a signed-out investor to `auth` first). Founder→investor DMs
                     ("Pitch" from an investor's profile) still open inside the community as before —
                     the founder IS a community member, so that side never changed.
  InvestorOnboarding.jsx — 6-step investor onboarding wizard (About you / Credentials / How you invest /
                     Where you focus / How you help / Your thesis). REQUIRED, no-skip: a signed-in
                     investor must finish before the `invest` dashboard renders (gated in App.jsx via
                     getInvestorProfile + a localStorage `so_investor_onboarded` fallback). Answers save
                     to `profiles.investor_profile` (jsonb) via saveInvestorProfile; single-choice fields
                     are dropdowns, multi-choice are multi-select (checkbox) dropdowns.
  InvestorProfile.jsx — the investor profile page (Figma layout: sticky header, avatar+name hero, stat
                     strip, scroll-spy tabs Thesis/Focus/Style/Credentials/Value-Add). Dual-mode: self
                     (`My profile` from the dashboard → Edit profile, re-opens onboarding pre-filled) and
                     founder-facing (`investorView` in App.jsx → "Pitch {name}" + a Send-Pitch CTA that
                     opens a DM). Community `goProfile` routes investor accounts here.
  InvestorProfileSections.jsx — the same investor sections rendered inline on a community ProfileView
                     (founder viewing an investor); gated on account_type==='investor' + completed.
  FounderOnboarding.jsx — 6-step founder onboarding wizard (About you / Your startup / Traction & team /
                     Your background / What you're building / What you're looking for). REQUIRED at the
                     gateway: gated in App.jsx via `so_founder_onboard_due` + getFounderProfile (+ a
                     localStorage `so_founder_onboarded_<uid>` fallback). Answers save to
                     `profiles.founder_profile` (jsonb) via saveFounderProfile. Same primitives as the
                     investor wizard (dropdowns + multi-select w/ flip-up) plus prefixed inputs
                     (linkedin.com/in/ · x.com/ · https://) and conditional raising fields.
  FounderProfile.jsx — the founder's investor-facing "deal page" (Figma layout: sticky identity
                     sidebar w/ startup + Actively-Raising card + section nav, and scrolling The Pitch /
                     Traction / Team / The Ask sections). Reached from the deal-flow: an investor taps a
                     pitch card's founder → `founderView` in App.jsx → "Express Interest" opens a DM
                     (pendingDM). Data from getFounderProfile; omits fields onboarding doesn't collect.
  Auth.jsx         — sign in/up (Google, GitHub, email/password); **password reset** (forgot →
                     resetPasswordForEmail; recovery link → set-new-password screen via App.jsx
                     `type=recovery`); **in-app-webview detection** (hides OAuth + shows email-first
                     fallback in WhatsApp/Instagram/FB browsers); Terms/Privacy links in consent + footer
  Legal.jsx        — Terms of Service + Privacy Policy pages (DPDP-aware **template** w/ [BRACKET]
                     placeholders the owner must fill in); reachable as `terms`/`privacy` views and via
                     `#/legal/terms` · `#/legal/privacy` shareable hash routes
  SubmitIdea.jsx   — 3-step form → quota check (consume_validation) → Gemini report; paywall screen
  MasterReport.jsx — 6-section report (Tailwind), score dashboard on Validation→Summary, share-to-community,
                     **PDF/print export** (a print-only `PrintReport` renders ALL sections; on-screen
                     UI is `print:hidden`; "Download PDF" buttons call `window.print()`)
  Community.jsx    — the community (~1900 lines): feed, composer (post/**pitch**/poll/article — the 💡 Pitch
                     mode adds a structured form: category/stage/amount/equity/website + file uploads,
                     saved as kind='pitch' + meta; pitch cards render a "seeking investment" banner) with an **audience
                     picker** (Everyone / Followers / Only me) + post **visibility badge** + author ⋯ menu
                     to **edit text & re-set audience** after posting (RLS-enforced — supabase_post_visibility.sql),
                     Rate (1–10), threaded comments+likes, repost, save, follow (approval), notifications bell,
                     rich profiles, photo carousel + fullscreen lightbox, link previews, verified
                     badge, "Followed by X" social proof, mobile bottom nav, and rich realtime DMs
                     (attachments: photo/video/doc/voice-note; emoji picker; reply; forward;
                     message reactions; read receipts; typing indicator; WhatsApp-style delete
                     [for-me / for-everyone tombstone] with 5s Undo; per-conversation Clear chat /
                     Delete chat from the header ⋯ menu — both your-view-only, reuse `deleted_for`)
  Pricing.jsx      — pricing page (₹50/mo, ₹500/yr) + Razorpay checkout
  Account.jsx      — account, validated-ideas list, re-open reports, hard delete
  reportEngine.js  — 6 Gemini section calls via /api/generate (2-worker concurrency, retries/backoff)
  communityDB.js   — all community Supabase queries
  billingDB.js     — subscription state, consume/refund validation RPCs, verified ids, start checkout
  ideasDB.js       — save/load/delete validated ideas (Supabase + localStorage fallback)
  supabaseClient.js, index.css, main.jsx

api/ (Vercel serverless — keys live here, never in the client bundle)
  generate.js          — Gemini proxy (auth-gated, model whitelist, prompt size cap; also requires a
                         valid report **grant** once REPORT_GRANT_SECRET is set — see start-report.js)
  start-report.js      — server-authoritative start of a report: consumes ONE validation
                         (consume_validation) and returns a short-lived HMAC grant authorizing that
                         report's generate calls, so the paywall can't be bypassed by hitting
                         /api/generate directly. Fails open until billing + REPORT_GRANT_SECRET exist.
  news.js              — live startup news (server-side TechCrunch RSS fetch)
  unfurl.js            — link-preview OG scraper (auth-gated, SSRF guards)
  razorpay-subscribe.js— create a Razorpay subscription (auth-gated; refuses a 2nd sub while one is
                         active, and records the sub id at creation so sync can reconcile)
  razorpay-webhook.js  — activate/deactivate subscription + verified badge (service-role key;
                         constant-time signature check, out-of-order guard via rzp_event_at, returns
                         non-2xx on DB-write failure so Razorpay retries)
  razorpay-sync.js     — reconcile a user's subscription vs Razorpay directly (fallback the client polls
                         after checkout, so a slow/missed webhook can't leave a paid user un-activated)
  razorpay-cancel.js   — cancel a subscription at cycle end (in-app "cancel anytime")
  delete-account.js    — REAL account deletion (service-role): verifies the caller's own session,
                         then deletes their auth user → cascades to profiles → posts/follows/messages/
                         ratings (so they vanish from search + community), and best-effort wipes their
                         avatars/post-media storage. Needs SUPABASE_SERVICE_ROLE_KEY; until it's set the
                         client shows an error instead of faking it. (The old in-app delete only logged
                         out + cleared localStorage, leaving the profile in search — fixed.)
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
12. supabase_message_media.sql      messages.media/reply_to/reactions/deleted_for/deleted/forwarded +
                                    text nullable + broadened update RLS (rich DMs; reuses post-media
                                    bucket). Idempotent — safe to re-run if you added columns earlier.
13. supabase_realtime_community.sql adds posts/ratings/suggestions/poll_votes/suggestion_likes/
                                    notifications/follows to the supabase_realtime publication (+ replica
                                    identity full) so the feed/bell/comments live-update. Idempotent.
14. supabase_billing.sql            LAST — only when Razorpay is ready (see Billing below)
15. supabase_community_hardening.sql  DM authorization + integrity (QA Phase 4): trigger so only the
                                    SENDER can tombstone a message, a `toggle_message_reaction` RPC
                                    (atomic, identity-checked), and post-media/avatars bucket size+mime
                                    limits. Idempotent; client degrades gracefully until it's run.
16. supabase_post_visibility.sql      post `visibility` column + audience-aware read policy (Everyone /
                                    Followers / Only me) + a posts UPDATE-own policy (so authors can
                                    edit + re-set audience). Until run, all posts stay public + edit
                                    fails (client degrades). ⚠️ "Only me"/"Followers" privacy is only
                                    enforced after this is run.
17. supabase_profile_role.sql         profiles `role` + `company` columns (LinkedIn-style). The
                                    under-name subtitle (`headlineOf`) derives from role + company; a
                                    custom `bio` headline still overrides, and it's blank if neither is
                                    set — replacing the old hardcoded "Founder · Startup Oracle" default.
                                    Until run, that misleading default is already gone (falls back to
                                    blank) but Role/Company just don't persist on save. Idempotent.
18. supabase_dm_message_request.sql   DM message requests (QA BUG-007): BEFORE INSERT trigger on
                                    `messages` — if the sender has no accepted follow with the recipient
                                    (either direction) AND the recipient hasn't messaged back, the sender
                                    may send only ONE message. Client (handleSend/ChatArea) enforces the
                                    same rule + shows a "message request" composer state. Degrades
                                    gracefully (client-only limit) until run. Idempotent.
19. supabase_follow_list_privacy.sql  Private follower/following lists (QA BUG-009): SECURITY DEFINER RPC
                                    `get_follow_list(target, kind)` — only the owner or an accepted
                                    follower may read the lists (counts + "Followed by X" stay public).
                                    fetchFollowList calls it, falling back to a direct select until run.
                                    Client also hides the lists from non-followers. Idempotent.
20. supabase_account_type.sql         Founder/Investor marketplace: `profiles.account_type`
                                    ('founder'|'investor') for the gateway + an index on
                                    community_posts(kind) for the investor deal-flow query. A pitch needs
                                    NO new columns (reuses kind/meta/media). Until run, everyone is treated
                                    as a founder (client falls back to 'founder') and pitching still works.
                                    Idempotent (kind index is guarded if posts_extra isn't run yet).
21. supabase_investor_profile.sql     `profiles.investor_profile` (jsonb) for the 6-step investor
                                    onboarding (InvestorOnboarding.jsx). Until run, onboarding works
                                    in-session (a localStorage flag remembers completion) but doesn't
                                    persist across devices. Idempotent.
22. supabase_founder_profile.sql      `profiles.founder_profile` (jsonb) for the 6-step founder
                                    onboarding (FounderOnboarding.jsx). Same as investor_profile — until
                                    run, onboarding works in-session but doesn't persist across devices.
                                    Idempotent.
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
reactions, "Seen" read receipts, typing indicator, WhatsApp-style delete — delete-for-me, or
delete-for-everyone leaving a "This message was deleted" tombstone, with a 5s Undo); rich profiles
(Role + Company, headline/About/Experience/Education/Skills, avatar+banner upload, profile-strength meter, "Who
viewed your profile"); **"Followed by X and Y"** social proof on profiles + sidebar suggestions;
multi-photo **carousel + fullscreen lightbox** (arrows, dots, Esc/arrow keys); link previews; polls;
shareable post permalinks (`#/idea/:id`); live Startup News; "Founders to follow"; Openings (placeholder);
mobile bottom nav; **Verified Founder badge** (Instagram-style blue check) for active subscribers;
**first-run onboarding checklist** (dismissible `OnboardingCard` at the top of the feed — complete
profile / post first idea / follow founders, persisted via `localStorage.so_onboard_dismissed`).

**Removed on purpose:** post reactions/Like (Rate replaces them); the whole connections / "My Network"
feature (followers + following only).

## Billing (DORMANT — do not enable until the domain is bought)

Subscription model via **Razorpay**: ₹50/month, ₹500/year. Free tier = **1 validation total**;
subscribers get **2 validations/month** + the verified badge. `consume_validation()` /
`refund_validation()` Postgres RPCs gate it atomically (quota constant is `2` in `supabase_billing.sql`).
Until `supabase_billing.sql` is run, gating **fails open** (everyone validates freely).

**Activation is webhook + reconciliation:** the webhook is the fast path; after checkout `Pricing`
also polls `/api/razorpay-sync` (which queries Razorpay directly and writes via service role) so a
slow/missed webhook can't leave a paid user un-activated. Subscriptions can be cancelled in-app
(`/api/razorpay-cancel`, at cycle end), creating a 2nd active sub is refused server-side, and the
webhook is idempotent (out-of-order guard via the `rzp_event_at` column).

To go live (owner): create Razorpay account + 2 Plans (monthly 5000 paise, yearly 50000 paise);
add Vercel env vars `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_MONTHLY`,
`RAZORPAY_PLAN_YEARLY`, `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`; run
`supabase_billing.sql`; configure the Razorpay webhook → `/api/razorpay-webhook`.

## Key Patterns

- **Auth**: OAuth implicit grant; hash tokens parsed in `App.jsx`; `localStorage.afterAuth` carries the
  intended destination across the redirect. Hard logout revokes all sessions + clears `sb-*` keys.
  **Password reset**: a recovery email link returns to the origin with `#…&type=recovery`; App.jsx detects
  it, calls `setSession`, sets `recovery` state, and renders the set-new-password screen (the
  "never show auth to a logged-in user" guard is skipped while `recovery` is true). **In-app webviews**
  (Instagram/WhatsApp/FB, where Google blocks OAuth) are detected by UA and shown email/password first.
  **Phone/OTP** sign-in (`signInWithOtp`/`verifyOtp`, +91 default) is wired and offered everywhere
  (incl. webviews, where it beats OAuth) — but stays a graceful scaffold until Supabase phone auth +
  an SMS provider are configured (until then it shows "Phone sign-in isn't available yet").
  **Resilience**: signup/reset enforce the advertised password policy (≥8 chars + uppercase + number via
  `validatePassword`); all auth network calls are wrapped in a 15s `withTimeout` race so a flaky connection
  shows an inline error instead of a stuck button; the boot gate renders the `<Loading/>` spinner (never a
  blank screen); OAuth errors render inline (no native `alert`).
- **Report generation**: 6 sections, each its own Gemini call through `/api/generate`
  (`GEMINI_API_KEY` server-side, model whitelist, prompt cap, retries + backoff). `MasterReport` shows
  a score dashboard (ring + sub-score bars) from the validation `_meta`. **Quota is server-authoritative**:
  `SubmitIdea` calls `/api/start-report` (one `consume_validation` + a grant) before generating, not the
  old client `consumeValidation`. **Resilience**: per-call 45s timeout + AbortController, a **Cancel**
  button, malformed-JSON is non-retryable, and a refresh mid-generation **resumes** the same consumed
  validation via `sessionStorage.so_pendingReport` (no double-charge). A validation is only spent when a
  **scored** report (sections + `_meta`) is delivered — otherwise the user can retry on the same credit
  or is refunded on abandon.
- **PostgREST joins**: explicit FK hints, e.g. `profiles!community_posts_user_id_fkey`.
- **Realtime (websockets)**: Supabase Realtime streams live updates so nothing needs a manual
  refresh — DMs (`subscribeToMessages`/`subscribeTyping`), the feed (`subscribeToCommunity` →
  debounced `fetchPosts`), the bell (`subscribeToInbox`, with a 60s safety poll), and open comment
  threads (`subscribeToThread`). Tables must be in the `supabase_realtime` publication
  (supabase_realtime_community.sql); degrades to the poll if not run.
- **Graceful degradation**: variant-ladder selects + try/catch fallbacks so missing migrations never
  crash the app.

## Design System

- **Theme**: **black & white minimal** (was briefly green — reverted). One **restrained accent**
  `--accent` `#2563eb` (matches the verified badge) is used for focus rings + active states (e.g. the
  feed tab indicator, `ACCENT` const in Community); Home stays pure editorial B&W on purpose. No dark mode yet.
- **Design tokens** live in `src/index.css` `:root` (`--ink/--ink-2/--ink-3`, `--line`, `--bg`,
  `--surface`, `--accent`, `--r*` radii, `--sh-*` shadows, `--ease`, `--font`/`--font-display`/
  `--font-serif`, a **type scale** `--t-xs … --t-3xl` + `--lh-*` line-heights, and a **4px spacing
  scale** `--s-1 … --s-9`). index.css also holds global polish: `:focus-visible` rings, button
  transitions/active-press, quiet scrollbars, `.skeleton` shimmer, `prefers-reduced-motion`, and a
  `@media print` block (Save-as-PDF), plus `input,textarea,select,button{font-family:inherit}` so
  controls stay on the ramp. Most components still use inline styles (legacy) with hardcoded values —
  migrate them to `var(--token)` as you touch them.
- **Motion**: beyond the global polish above, several components layer their own local `<style>`
  keyframes (scoped by class name, not tokens): Home's scroll-triggered reveals (IntersectionObserver
  + CSS transition — respects reduced-motion automatically since it's a `transition`), Community's
  `.fade-up`/`.badge-pop`/`.msg-pop`/`.toast-in` and Invest's `.inv-fade-up` (feed/deal-flow cards
  stagger in via a per-index `animationDelay`; new DM messages and notification badges pop via
  key-remount), the Founder/Investor onboarding wizards' `.fo-step`/`.io-step` (step content
  fades+slides on `step` change, via `key={step}`), and MasterReport's Oracle Score ring (counts up
  from 0 via `requestAnimationFrame` on mount — **this one is JS-driven, not CSS, so it explicitly
  checks `prefers-reduced-motion` itself** rather than relying on the global CSS override). Primary
  buttons across Auth/SubmitIdea/Account/Pricing share a small press/lift micro-interaction.
- **Fonts (UNIFIED type ramp)**: one ramp everywhere — **DM Sans** (`var(--font)`) for body/UI,
  **Plus Jakarta Sans** (`var(--font-display)`) for headings/display/numbers. Forms (Auth/SubmitIdea/
  Account/Pricing) and the report (MasterReport) were migrated off Jakarta-for-everything onto this
  ramp; each defines `F = var(--font)` + `FD = var(--font-display)`. **Cormorant Garamond is kept
  deliberately for the Home editorial hero + wordmark only** (the one allowed exception). Unused
  Syne / DM Mono were dropped from the font import.
- No component library; everything is custom.

## Known Constraints / Gotchas

- Commit/push to `main` = auto-deploy. End commit messages with the Co-Authored-By line.
- `/api/*` doesn't run under `npm run dev` — test those on the deployed site or via `npx vercel dev`.
- Billing + the "Followed by X" social proof can't be verified locally (need real auth + follow graph).
- No test suite — verify changes in the browser.
- `Community.jsx` is ~1700 lines; consider splitting (DM panel, ProfileView, composer, media) if refactoring.
