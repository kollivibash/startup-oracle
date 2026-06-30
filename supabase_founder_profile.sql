-- Founder onboarding profile (FounderOnboarding.jsx). Mirrors supabase_investor_profile.sql.
-- One JSONB blob with a `completed` flag; saveFounderProfile also mirrors a few fields
-- (name / company / role / bio / location) onto the profile so the community profile + headline
-- reflect them. Until run, founder onboarding works in-session (a localStorage flag remembers
-- completion) but doesn't persist across devices. Idempotent — safe to re-run.

alter table public.profiles
  add column if not exists founder_profile jsonb;
