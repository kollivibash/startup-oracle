-- Phase 3 — Network: run in Supabase SQL Editor (after community tables). Safe to re-run.

-- 1. Connections (mutual, LinkedIn-style: request + optional note, accept/ignore)
create table if not exists connections (
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted')),
  note         text,
  created_at   timestamptz default now(),
  primary key (requester_id, addressee_id),
  constraint no_self_connect check (requester_id <> addressee_id)
);
alter table connections enable row level security;
drop policy if exists "conn_read"   on connections;
drop policy if exists "conn_insert" on connections;
drop policy if exists "conn_update" on connections;
drop policy if exists "conn_delete" on connections;
create policy "conn_read"   on connections for select using (true);
create policy "conn_insert" on connections for insert with check (auth.uid() = requester_id);
create policy "conn_update" on connections for update using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);
create policy "conn_delete" on connections for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);
create index if not exists connections_addressee_idx on connections(addressee_id);
create index if not exists connections_requester_idx on connections(requester_id);

-- 2. Profile views ("Who viewed your profile")
create table if not exists profile_views (
  viewer_id  uuid not null references profiles(id) on delete cascade,
  viewed_id  uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (viewer_id, viewed_id),
  constraint no_self_view check (viewer_id <> viewed_id)
);
alter table profile_views enable row level security;
drop policy if exists "pv_read"   on profile_views;
drop policy if exists "pv_insert" on profile_views;
drop policy if exists "pv_update" on profile_views;
create policy "pv_read"   on profile_views for select using (auth.uid() = viewed_id or auth.uid() = viewer_id);
create policy "pv_insert" on profile_views for insert with check (auth.uid() = viewer_id);
create policy "pv_update" on profile_views for update using (auth.uid() = viewer_id) with check (auth.uid() = viewer_id);
create index if not exists profile_views_viewed_idx on profile_views(viewed_id, created_at desc);
