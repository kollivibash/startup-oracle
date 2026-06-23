-- Profile role + company (LinkedIn-style): run in Supabase SQL Editor
-- (after supabase_profiles_rich.sql). Safe to re-run.
--
-- Until this is run, the app degrades gracefully: the feed/profiles still load,
-- the misleading "Founder · Startup Oracle" label is already gone (it now falls
-- back to a blank subtitle), and Role/Company simply don't persist on save.
-- After running it, users can set Role + Company in Edit profile and the subtitle
-- under their name shows "Role at Company" (unless they set a custom Headline).

alter table profiles add column if not exists role    text;
alter table profiles add column if not exists company text;
