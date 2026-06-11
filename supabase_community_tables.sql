-- Community tables: run in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Public profiles (auto-created for every auth user, joinable from community rows)
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  avatar_url text,
  bio        text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "profiles_read"       on profiles for select using (true);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for existing users
insert into profiles (id, name, avatar_url)
select id,
       coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
       raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

-- 2. Idea posts
create table if not exists community_posts (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null,
  body       text,
  tags       text[] default '{}',
  created_at timestamptz default now()
);
alter table community_posts enable row level security;
create policy "posts_read"       on community_posts for select using (true);
create policy "posts_insert_own" on community_posts for insert with check (auth.uid() = user_id);
create policy "posts_delete_own" on community_posts for delete using (auth.uid() = user_id);
create index if not exists community_posts_created_idx on community_posts(created_at desc);
create index if not exists community_posts_user_idx on community_posts(user_id);

-- 3. Ratings (one per user per post, half-star precision)
create table if not exists community_ratings (
  post_id    uuid not null references community_posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  value      numeric(2,1) not null check (value >= 0.5 and value <= 5),
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
alter table community_ratings enable row level security;
create policy "ratings_read"       on community_ratings for select using (true);
create policy "ratings_insert_own" on community_ratings for insert with check (auth.uid() = user_id);
create policy "ratings_update_own" on community_ratings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Suggestions (comments)
create table if not exists community_suggestions (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid not null references community_posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  text       text not null,
  created_at timestamptz default now()
);
alter table community_suggestions enable row level security;
create policy "suggestions_read"       on community_suggestions for select using (true);
create policy "suggestions_insert_own" on community_suggestions for insert with check (auth.uid() = user_id);
create policy "suggestions_delete_own" on community_suggestions for delete using (auth.uid() = user_id);
create index if not exists community_suggestions_post_idx on community_suggestions(post_id);

-- 5. Follows
create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followee_id uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (follower_id, followee_id),
  constraint no_self_follow check (follower_id <> followee_id)
);
alter table follows enable row level security;
create policy "follows_read"       on follows for select using (true);
create policy "follows_insert_own" on follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on follows for delete using (auth.uid() = follower_id);
create index if not exists follows_followee_idx on follows(followee_id);
