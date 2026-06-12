-- Follow requests (accept / reject): run in Supabase SQL Editor
-- (after supabase_community_tables.sql)

-- 1. Status column: new follows start as 'pending' until accepted.
--    Existing follows are grandfathered in as 'accepted'.
alter table follows add column if not exists status text not null default 'pending'
  check (status in ('pending','accepted'));
update follows set status = 'accepted' where status = 'pending';

-- 2. The person being followed can accept a request…
drop policy if exists "follows_accept" on follows;
create policy "follows_accept" on follows for update
  using (auth.uid() = followee_id) with check (auth.uid() = followee_id);

-- 3. …and either side can delete (reject / cancel / unfollow)
drop policy if exists "follows_delete_own" on follows;
create policy "follows_delete_own" on follows for delete
  using (auth.uid() = follower_id or auth.uid() = followee_id);
