-- Community hardening (QA Phase 4). Run in Supabase SQL Editor. Idempotent / safe to re-run.
-- Notifications RLS is already correct (notif_insert_self enforces actor_id = auth.uid()),
-- so this file targets DM authorization (COM-002), reaction integrity (COM-005), and
-- storage upload limits (COM-003).

-- ── COM-002: only the SENDER may set the delete-for-everyone tombstone ─────────────
-- messages_update_party (supabase_message_media.sql) lets EITHER party update a row, which
-- a recipient could abuse to tombstone the sender's message. This trigger silently reverts
-- any `deleted` change made by someone other than the sender (read receipts, reactions via
-- the RPC below, and delete-for-me still work for both parties).
create or replace function guard_message_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted is distinct from old.deleted and auth.uid() <> old.sender_id then
    new.deleted := old.deleted;
  end if;
  return new;
end; $$;

drop trigger if exists guard_message_update_trg on messages;
create trigger guard_message_update_trg
  before update on messages for each row execute function guard_message_update();

-- ── COM-005 / COM-002: atomic, identity-checked message reactions ──────────────────
-- Replaces the client read-modify-write of the whole reactions JSON (which loses concurrent
-- reactions and let a party rewrite the map). Toggles only the caller's own uid. SECURITY
-- DEFINER + auth.uid() so the caller can only add/remove themselves.
create or replace function toggle_message_reaction(p_message_id uuid, p_emoji text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m   record;
  r   jsonb;
  arr jsonb;
begin
  if uid is null then return '{}'::jsonb; end if;
  select * into m from messages where id = p_message_id for update;
  if not found then return '{}'::jsonb; end if;
  if uid <> m.sender_id and uid <> m.recipient_id then return coalesce(m.reactions, '{}'::jsonb); end if;

  r   := coalesce(m.reactions, '{}'::jsonb);
  arr := coalesce(r -> p_emoji, '[]'::jsonb);
  if arr @> to_jsonb(uid::text) then
    select coalesce(jsonb_agg(e), '[]'::jsonb) into arr
      from jsonb_array_elements_text(arr) e where e <> uid::text;
  else
    arr := arr || to_jsonb(uid::text);
  end if;
  if jsonb_array_length(arr) = 0 then r := r - p_emoji; else r := jsonb_set(r, array[p_emoji], arr); end if;

  update messages set reactions = r where id = p_message_id;
  return r;
end; $$;

grant execute on function toggle_message_reaction(uuid, text) to authenticated;

-- ── COM-003: cap upload size + restrict types at the storage layer ─────────────────
-- Client validation is a courtesy; this is the real enforcement (the buckets are public).
update storage.buckets
   set file_size_limit = 26214400,  -- 25 MB
       allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/quicktime','audio/webm','audio/mpeg','audio/mp4','application/pdf']
 where id = 'post-media';

update storage.buckets
   set file_size_limit = 5242880,   -- 5 MB
       allowed_mime_types = array['image/png','image/jpeg','image/webp']
 where id = 'avatars';
