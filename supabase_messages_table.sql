-- Direct messages: run in Supabase SQL Editor (after supabase_community_tables.sql)

create table if not exists messages (
  id           uuid default gen_random_uuid() primary key,
  sender_id    uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  text         text not null,
  read         boolean default false,
  created_at   timestamptz default now(),
  constraint no_self_dm check (sender_id <> recipient_id)
);

alter table messages enable row level security;
create policy "messages_read_own" on messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "messages_send_own" on messages for insert
  with check (auth.uid() = sender_id);
create policy "messages_mark_read" on messages for update
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

create index if not exists messages_sender_idx    on messages(sender_id, created_at);
create index if not exists messages_recipient_idx on messages(recipient_id, read);

-- Enable realtime delivery for new messages (idempotent)
do $$
begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null;
end $$;
