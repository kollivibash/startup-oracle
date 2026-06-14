-- Phase 2 — Rich profiles: run in Supabase SQL Editor
-- (after supabase_community_tables.sql). Safe to re-run.

-- 1. Rich profile fields (headline reuses the existing `bio` column)
alter table profiles add column if not exists about      text;
alter table profiles add column if not exists location   text;
alter table profiles add column if not exists banner_url text;
alter table profiles add column if not exists experience jsonb  default '[]';
alter table profiles add column if not exists education  jsonb  default '[]';
alter table profiles add column if not exists skills     text[] default '{}';

-- 2. Public storage bucket for avatars + banners
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Storage RLS: anyone can read; users manage only their own folder (path = <uid>/...)
drop policy if exists "avatars_read"        on storage.objects;
drop policy if exists "avatars_insert_own"  on storage.objects;
drop policy if exists "avatars_update_own"  on storage.objects;
drop policy if exists "avatars_delete_own"  on storage.objects;
create policy "avatars_read"       on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_insert_own" on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update_own" on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_delete_own" on storage.objects for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
