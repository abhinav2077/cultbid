-- =========================================================
-- cultbid.in — Razorpay integration migration
-- Run this AFTER supabase/schema.sql, in SQL Editor → New query → Run.
-- (If you're setting up a brand new project, schema.sql already
-- includes an equivalent version of this — you'd only run this
-- file against a project that ran the earlier schema.sql.)
-- =========================================================

-- ---------------------------------------------------------
-- 1. Track the payment lifecycle instead of assuming every
--    inserted row is money-in-hand.
--
--    created   → order was created, checkout opened, nothing
--                confirmed yet (this is what a client can insert)
--    captured  → Razorpay cryptographically confirmed the money
--                arrived (only the server can set this)
--    failed    → payment attempt did not go through
-- ---------------------------------------------------------
alter table public.payments
  add column provider              text not null default 'razorpay',
  add column provider_order_id     text,
  add column provider_payment_id   text unique,
  add column status                text not null default 'created'
                                    check (status in ('created', 'captured', 'failed'));

create index payments_provider_order_id_idx on public.payments (provider_order_id);

-- ---------------------------------------------------------
-- 2. Replace the payment trigger: total_paid now only moves
--    when a row's status becomes 'captured' — whether that
--    happens on insert (shouldn't, for client inserts — see
--    the policy below) or via an UPDATE from the server after
--    signature verification.
--
--    The "old.status is distinct from 'captured'" guard makes
--    this safe to run twice for the same row (e.g. your /verify
--    route AND the webhook both firing for one payment) — the
--    second one is a no-op instead of double-counting.
-- ---------------------------------------------------------
create or replace function public.apply_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'captured'
     and (tg_op = 'INSERT' or old.status is distinct from 'captured') then
    update public.profiles
    set total_paid = total_paid + new.amount
    where id = new.user_id;
  end if;
  return new;
end;
$$;

-- on_payment_insert already exists from schema.sql and reuses this
-- function automatically since we just replaced its body. We only
-- need to add the UPDATE trigger:
drop trigger if exists on_payment_status_change on public.payments;
create trigger on_payment_status_change
after update on public.payments
for each row execute function public.apply_payment();

-- ---------------------------------------------------------
-- 3. Tighten the insert policy: a client (even one bypassing
--    your API and calling Supabase directly from the browser
--    console) can only ever insert a *pending* payment row.
--    Nobody except your server — using the service_role key,
--    after verifying Razorpay's cryptographic signature — can
--    ever move a row to 'captured'. This is the actual security
--    boundary; guard it carefully if you ever touch this policy.
-- ---------------------------------------------------------
drop policy if exists "Users can insert their own payments" on public.payments;

create policy "Users can insert their own pending payments"
on public.payments for insert
with check (auth.uid() = user_id and status = 'created');

-- No UPDATE policy is added for the `authenticated` role on purpose —
-- status transitions happen exclusively via service_role, which
-- bypasses RLS by design. Do not add a client-facing UPDATE policy
-- on payments unless you fully understand what it would unlock.
