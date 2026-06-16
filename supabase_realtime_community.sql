-- Realtime (websocket) change-streaming for the community so the feed, ratings,
-- comments, polls, notifications and follow requests update live — no manual refresh.
-- Supabase Realtime is already enabled for `messages` (supabase_messages_table.sql);
-- this adds the rest of the community tables to the same publication.
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.

do $$
declare t text;
begin
  foreach t in array array[
    'community_posts', 'community_ratings', 'community_suggestions',
    'poll_votes', 'suggestion_likes', 'notifications', 'follows'
  ] loop
    -- add to the realtime publication (ignore if already added / table missing)
    begin execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null; when undefined_table then null; end;
    -- full row on UPDATE/DELETE events so clients can react to old values + RLS filters
    begin execute format('alter table %I replica identity full', t);
    exception when undefined_table then null; end;
  end loop;
end $$;
