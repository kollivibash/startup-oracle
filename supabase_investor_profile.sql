-- Investor onboarding profile — run in Supabase SQL Editor. Idempotent / safe to re-run.
-- Stores the 6-step investor onboarding answers (shown after "Continue as Investor") as one JSONB
-- blob, plus a `completed:true` flag the client uses to gate the deal-flow dashboard. Until this is
-- run, onboarding still works in-session (the client also remembers completion in localStorage) — it
-- just won't persist across devices. No new table needed; it hangs off the existing profiles row.

alter table profiles add column if not exists investor_profile jsonb;
