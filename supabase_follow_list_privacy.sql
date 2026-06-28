-- Private follower/following lists (BUG-009): run in Supabase SQL Editor
-- (after supabase_follow_requests.sql). Safe to re-run.
--
-- Rule: only the profile owner OR an accepted follower of that user may view their
-- Followers / Following lists. Counts and "Followed by X" social proof stay public.
-- The client (Community.jsx) hides the lists from non-followers; this RPC is the
-- real backstop so the lists can't be scraped via the API.
--
-- Degrades gracefully: until this is run, fetchFollowList falls back to a direct
-- select and the lists stay publicly readable (client still hides the UI).

create or replace function get_follow_list(target uuid, kind text)
returns setof profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Caller must be the owner or an accepted follower of `target`.
  if auth.uid() is null
     or ( auth.uid() <> target
          and not exists (
            select 1 from follows f
            where f.follower_id = auth.uid()
              and f.followee_id = target
              and f.status = 'accepted'
          ) ) then
    raise exception 'FOLLOW_LIST_PRIVATE: only followers can see this list';
  end if;

  if kind = 'followers' then
    -- people who follow `target`
    return query
      select p.* from profiles p
      join follows f on f.follower_id = p.id
      where f.followee_id = target and f.status = 'accepted';
  else
    -- people `target` follows
    return query
      select p.* from profiles p
      join follows f on f.followee_id = p.id
      where f.follower_id = target and f.status = 'accepted';
  end if;
end;
$$;

grant execute on function get_follow_list(uuid, text) to anon, authenticated;
