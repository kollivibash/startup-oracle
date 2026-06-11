-- Post media (photos + documents): run in Supabase SQL Editor
-- (after supabase_community_tables.sql)

-- 1. Column to store attached media on each post:
--    array of { url, type ('image' | 'file'), name, size }
alter table community_posts add column if not exists media jsonb default '[]'::jsonb;

-- 2. Public storage bucket for uploaded photos & documents
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

-- 3. Storage policies (drop-then-create so this file is re-runnable)
drop policy if exists "post_media_public_read" on storage.objects;
drop policy if exists "post_media_auth_insert" on storage.objects;
drop policy if exists "post_media_owner_delete" on storage.objects;

create policy "post_media_public_read" on storage.objects
  for select using (bucket_id = 'post-media');

create policy "post_media_auth_insert" on storage.objects
  for insert with check (bucket_id = 'post-media' and auth.role() = 'authenticated');

create policy "post_media_owner_delete" on storage.objects
  for delete using (bucket_id = 'post-media' and owner = auth.uid());
