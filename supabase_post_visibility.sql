-- Post visibility / audience. Run in Supabase SQL Editor. Idempotent / safe to re-run.
-- visibility: 'public' (Everyone) | 'followers' (people who follow the author) | 'private' (Only me).
-- Requires the follows.status column (supabase_follow_requests.sql, migration #4).

alter table community_posts add column if not exists visibility text not null default 'public';

-- Read policy now respects visibility (was `using (true)`): public to everyone, followers-only to the
-- author's accepted followers, private to the author only.
drop policy if exists "posts_read" on community_posts;
create policy "posts_read" on community_posts for select using (
  visibility = 'public'
  or user_id = auth.uid()
  or (visibility = 'followers' and exists (
        select 1 from follows f
         where f.follower_id = auth.uid()
           and f.followee_id = community_posts.user_id
           and f.status = 'accepted'))
);

-- Authors can edit their own posts (text + audience) — there was no UPDATE policy before, so editing
-- and re-setting visibility were both impossible.
drop policy if exists "posts_update_own" on community_posts;
create policy "posts_update_own" on community_posts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
