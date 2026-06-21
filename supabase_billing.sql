-- Billing & subscriptions (Razorpay). Run in Supabase SQL Editor. Safe to re-run.
-- Free tier: 1 validation total. Subscribers (₹50/mo or ₹500/yr): 2 validations / month + verified badge.

alter table profiles add column if not exists sub_status          text default 'free'; -- 'free' | 'active'
alter table profiles add column if not exists sub_plan            text;                -- 'monthly' | 'yearly'
alter table profiles add column if not exists sub_until           timestamptz;
alter table profiles add column if not exists verified            boolean default false;
alter table profiles add column if not exists free_used           boolean default false;
alter table profiles add column if not exists val_month           text;                -- 'YYYY-MM'
alter table profiles add column if not exists val_count           int default 0;
alter table profiles add column if not exists rzp_customer_id     text;
alter table profiles add column if not exists rzp_subscription_id text;
alter table profiles add column if not exists rzp_event_at        timestamptz;         -- last applied webhook event time (out-of-order guard)

-- Atomically check the caller's quota and consume one validation.
-- Returns { allowed: bool, reason: text, remaining: int }
create or replace function consume_validation()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prof profiles%rowtype;
  cur_month text := to_char(now() at time zone 'utc', 'YYYY-MM');
  active boolean;
  quota int := 2;  -- subscriber validations per month
begin
  if uid is null then return jsonb_build_object('allowed', false, 'reason', 'auth'); end if;
  select * into prof from profiles where id = uid for update;
  active := prof.sub_status = 'active' and (prof.sub_until is null or prof.sub_until > now());
  if active then
    if prof.val_month is distinct from cur_month then
      update profiles set val_month = cur_month, val_count = 0 where id = uid;
      prof.val_count := 0;
    end if;
    if coalesce(prof.val_count, 0) >= quota then
      return jsonb_build_object('allowed', false, 'reason', 'month_limit', 'remaining', 0);
    end if;
    update profiles set val_count = coalesce(val_count, 0) + 1 where id = uid;
    return jsonb_build_object('allowed', true, 'remaining', quota - (coalesce(prof.val_count, 0) + 1));
  else
    if coalesce(prof.free_used, false) then
      return jsonb_build_object('allowed', false, 'reason', 'need_sub', 'remaining', 0);
    end if;
    update profiles set free_used = true where id = uid;
    return jsonb_build_object('allowed', true, 'remaining', 0);
  end if;
end; $$;

-- Give a validation back if generation completely failed.
create or replace function refund_validation()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); prof profiles%rowtype; active boolean;
begin
  if uid is null then return; end if;
  select * into prof from profiles where id = uid for update;
  active := prof.sub_status = 'active' and (prof.sub_until is null or prof.sub_until > now());
  if active then
    update profiles set val_count = greatest(coalesce(val_count, 0) - 1, 0) where id = uid;
  else
    update profiles set free_used = false where id = uid;
  end if;
end; $$;

grant execute on function consume_validation() to authenticated;
grant execute on function refund_validation() to authenticated;

-- Index for the verified-badge lookup
create index if not exists profiles_verified_idx on profiles(verified) where verified = true;
