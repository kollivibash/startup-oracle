-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
create table if not exists ideas (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  category    text,
  score       integer,
  meta        jsonb,
  sections    jsonb,
  form        jsonb,
  created_at  timestamptz default now()
);

alter table ideas enable row level security;

create policy "users_own_ideas" on ideas
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists ideas_user_id_idx on ideas(user_id);
