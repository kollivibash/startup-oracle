-- Rich direct messages: attachments, reply, reactions, soft-delete (delete-for-me /
-- unsend-for-everyone), forward. Run in Supabase SQL Editor AFTER supabase_messages_table.sql.
-- DM attachments reuse the existing public `post-media` storage bucket (supabase_post_media.sql),
-- so no new bucket is needed here.

-- Allow attachment-only messages (no text).
alter table messages alter column text drop not null;

-- New columns — all nullable / defaulted so every DB call degrades gracefully before this runs.
alter table messages add column if not exists media       jsonb;                 -- [{type:'image'|'video'|'file'|'audio', url, name, size}]
alter table messages add column if not exists reply_to    uuid references messages(id) on delete set null;
alter table messages add column if not exists reactions   jsonb   default '{}'::jsonb;   -- {"❤️":[userId,…], …}
alter table messages add column if not exists deleted_for jsonb   default '[]'::jsonb;   -- userIds who removed it (both = unsent)
alter table messages add column if not exists forwarded   boolean default false;

-- Either party may update a message now (reactions, mark-read, delete-for-me, unsend).
drop policy if exists "messages_mark_read" on messages;
create policy "messages_update_party" on messages for update
  using (auth.uid() = sender_id or auth.uid() = recipient_id)
  with check (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Include full row on UPDATE realtime events so clients can merge reaction/read/delete changes.
alter table messages replica identity full;
