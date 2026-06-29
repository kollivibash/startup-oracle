-- Account type (founder | investor) — run in Supabase SQL Editor. Idempotent / safe to re-run.
-- Powers the Founder/Investor gateway shown after "Build Community". Until this is run, everyone is
-- treated as a founder (the client falls back to 'founder') and pitches still work — a pitch is just
-- a community_posts row with kind='pitch', so nothing here is required for pitching to function.

alter table profiles add column if not exists account_type text not null default 'founder';

-- A pitch reuses the posts table: kind='pitch', with its structured fields in the existing meta jsonb
--   { pitch:true, category, stage, amount, equity, website }
-- so it inherits posts' media uploads, RLS, realtime and the feed renderer (no new table needed).
-- This index keeps the investor deal-flow query (where kind='pitch') fast. Guarded so it's safe to
-- run even before supabase_posts_extra.sql adds the `kind` column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'community_posts' and column_name = 'kind'
  ) then
    create index if not exists community_posts_kind_idx on community_posts(kind);
  end if;
end $$;
