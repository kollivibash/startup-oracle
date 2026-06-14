-- Notifications: run in Supabase SQL Editor (after supabase_community_tables.sql)
-- Fires when someone rates/suggests on your idea or accepts your follow request.

create table if not exists notifications (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid not null references profiles(id) on delete cascade,   -- recipient
  actor_id   uuid not null references profiles(id) on delete cascade,   -- who did it
  type       text not null check (type in ('rating','suggestion','follow_accept')),
  post_id    uuid references community_posts(id) on delete cascade,
  data       jsonb default '{}',
  read       boolean default false,
  created_at timestamptz default now()
);
alter table notifications enable row level security;
create policy "notif_read_own"   on notifications for select using (auth.uid() = user_id);
create policy "notif_insert_self" on notifications for insert with check (auth.uid() = actor_id);
create policy "notif_update_own"  on notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists notifications_user_idx on notifications(user_id, created_at desc);
