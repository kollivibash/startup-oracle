-- DM message requests (BUG-007): run in Supabase SQL Editor (after
-- supabase_messages_table.sql + supabase_follow_requests.sql). Safe to re-run.
--
-- Rule: anyone can open a DM, but if the sender does NOT have an accepted follow
-- with the recipient (in either direction) AND the recipient has never messaged
-- the sender back, the sender may send only ONE message until that changes.
-- The client (Community.jsx handleSend / ChatArea) enforces this for honest users;
-- this trigger is the real backstop so it can't be bypassed via the API.
--
-- Degrades gracefully: until this is run, only the client limit applies.

create or replace function enforce_message_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_follow   boolean;
  peer_replied boolean;
  my_prior     integer;
begin
  -- 1. Accepted follow between the two users in EITHER direction → unrestricted.
  select exists (
    select 1 from follows f
    where f.status = 'accepted'
      and ( (f.follower_id = new.sender_id    and f.followee_id = new.recipient_id)
         or (f.follower_id = new.recipient_id and f.followee_id = new.sender_id) )
  ) into has_follow;
  if has_follow then
    return new;
  end if;

  -- 2. Recipient has already messaged the sender → conversation is open.
  select exists (
    select 1 from messages m
    where m.sender_id = new.recipient_id and m.recipient_id = new.sender_id
  ) into peer_replied;
  if peer_replied then
    return new;
  end if;

  -- 3. Otherwise the sender may have at most ONE prior message to this recipient.
  select count(*) into my_prior
  from messages m
  where m.sender_id = new.sender_id and m.recipient_id = new.recipient_id;

  if my_prior >= 1 then
    raise exception 'MESSAGE_REQUEST_LIMIT: you can send only one message until they reply or follow you back';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_message_request on messages;
create trigger trg_message_request
  before insert on messages
  for each row execute function enforce_message_request();
