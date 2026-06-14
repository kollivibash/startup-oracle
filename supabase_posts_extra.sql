-- Phase 4 — New post types: run in Supabase SQL Editor (after community tables). Safe to re-run.

-- 1. Post kind + poll + link preview data
alter table community_posts add column if not exists kind         text default 'post';  -- 'post' | 'poll' | 'article'
alter table community_posts add column if not exists poll         jsonb;                -- { question, options:[text] }
alter table community_posts add column if not exists link_preview jsonb;                -- { url, title, description, image, site }

-- 2. Poll votes (one per user per poll)
create table if not exists poll_votes (
  post_id    uuid not null references community_posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  option_idx int  not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
alter table poll_votes enable row level security;
drop policy if exists "pollvotes_read"       on poll_votes;
drop policy if exists "pollvotes_insert_own" on poll_votes;
drop policy if exists "pollvotes_update_own" on poll_votes;
drop policy if exists "pollvotes_delete_own" on poll_votes;
create policy "pollvotes_read"       on poll_votes for select using (true);
create policy "pollvotes_insert_own" on poll_votes for insert with check (auth.uid() = user_id);
create policy "pollvotes_update_own" on poll_votes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pollvotes_delete_own" on poll_votes for delete using (auth.uid() = user_id);
create index if not exists poll_votes_post_idx on poll_votes(post_id);
