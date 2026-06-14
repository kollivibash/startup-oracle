-- Phase 1 — Post engagement: run in Supabase SQL Editor
-- (after supabase_community_tables.sql + supabase_notifications.sql)

-- 1. Reactions on posts (one per user; re-react updates the type)
create table if not exists post_reactions (
  post_id    uuid not null references community_posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null check (type in ('like','celebrate','support','insightful','love','funny')),
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
alter table post_reactions enable row level security;
create policy "reactions_read"       on post_reactions for select using (true);
create policy "reactions_insert_own" on post_reactions for insert with check (auth.uid() = user_id);
create policy "reactions_update_own" on post_reactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reactions_delete_own" on post_reactions for delete using (auth.uid() = user_id);
create index if not exists post_reactions_post_idx on post_reactions(post_id);

-- 2. Threaded comment replies + likes
alter table community_suggestions add column if not exists parent_id uuid references community_suggestions(id) on delete cascade;

create table if not exists suggestion_likes (
  suggestion_id uuid not null references community_suggestions(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz default now(),
  primary key (suggestion_id, user_id)
);
alter table suggestion_likes enable row level security;
create policy "suglikes_read"       on suggestion_likes for select using (true);
create policy "suglikes_insert_own" on suggestion_likes for insert with check (auth.uid() = user_id);
create policy "suglikes_delete_own" on suggestion_likes for delete using (auth.uid() = user_id);

-- 3. Repost (a post that references another post)
alter table community_posts add column if not exists repost_of uuid references community_posts(id) on delete set null;

-- 4. Saved / bookmarked posts (private to each user)
create table if not exists saved_posts (
  user_id    uuid not null references profiles(id) on delete cascade,
  post_id    uuid not null references community_posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);
alter table saved_posts enable row level security;
create policy "saved_read_own"   on saved_posts for select using (auth.uid() = user_id);
create policy "saved_insert_own" on saved_posts for insert with check (auth.uid() = user_id);
create policy "saved_delete_own" on saved_posts for delete using (auth.uid() = user_id);

-- 5. Allow the new notification types
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('rating','suggestion','follow_accept','reaction','comment_like','reply','repost','connect','connect_accept','mention'));
