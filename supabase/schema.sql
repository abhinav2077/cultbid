-- =========================================================
-- cultbid.in — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- =========================================================

-- ---------------------------------------------------------
-- 1. profiles
--    One row per user, 1:1 with auth.users (Supabase Auth
--    owns email + password — we never store or touch the
--    password ourselves, it's already hashed by Supabase).
-- ---------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  username              text unique not null,
  name                  text not null,
  bio                   text not null default '',
  gender                text check (gender in ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  avatar_path           text,                 -- path inside the "avatars" storage bucket, e.g. "<user_id>/profile.jpg"
  instagram_url         text,
  twitter_url           text,
  facebook_url          text,
  youtube_url           text,
  custom_link1_url      text,
  custom_link1_label    text,
  custom_link2_url      text,
  custom_link2_label    text,
  total_paid            numeric(12, 2) not null default 0,   -- NEVER updated directly by clients — see grants below
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 2. payments
--    Append-only ledger. total_paid on profiles is always
--    derived from this table via the trigger below, so the
--    leaderboard number and the audit trail can never drift.
-- ---------------------------------------------------------
create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  amount              numeric(12, 2) not null check (amount > 0),
  provider            text not null default 'razorpay',
  provider_order_id   text,
  provider_payment_id text unique,
  -- created: order opened, nothing confirmed yet (all a client can insert)
  -- captured: Razorpay cryptographically confirmed the money arrived
  --           (only the server, via service_role, can set this)
  -- failed: payment attempt did not go through
  status              text not null default 'created' check (status in ('created', 'captured', 'failed')),
  created_at          timestamptz not null default now()
);

create index payments_provider_order_id_idx on public.payments (provider_order_id);

create index payments_user_id_idx on public.payments (user_id);
create index profiles_total_paid_idx on public.profiles (total_paid desc);

-- ---------------------------------------------------------
-- 3. Trigger: inserting a payment bumps the owner's total_paid.
--    SECURITY DEFINER means it runs with the privileges of the
--    function owner (not the calling user), so it can update
--    total_paid even though normal clients are blocked from
--    doing so directly (see grants below).
-- ---------------------------------------------------------
create or replace function public.apply_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only ever move total_paid when a row is (or becomes) 'captured' —
  -- the guard on UPDATE makes this safe to fire twice for one payment
  -- (e.g. both the /verify route and the webhook), so it never double-counts.
  if new.status = 'captured'
     and (tg_op = 'INSERT' or old.status is distinct from 'captured') then
    update public.profiles
    set total_paid = total_paid + new.amount
    where id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger on_payment_insert
after insert on public.payments
for each row execute function public.apply_payment();

create trigger on_payment_status_change
after update on public.payments
for each row execute function public.apply_payment();

-- ---------------------------------------------------------
-- 4. Trigger: auto-create a profiles row whenever someone
--    signs up via Supabase Auth. username/name come from the
--    `options.data` you pass to supabase.auth.signUp(...).
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'name', 'New user')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.payments enable row level security;

-- Anyone (including logged-out visitors) can read the leaderboard.
create policy "Profiles are publicly readable"
on public.profiles for select
using (true);

-- Logged-in users can update their own row...
create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- ...but column-level grants are what actually stop total_paid
-- from being edited by a client — RLS alone only checks *which
-- row*, not *which column*. This is the real enforcement:
revoke update on public.profiles from authenticated;
grant update (
  name, username, bio, gender, avatar_path,
  instagram_url, twitter_url, facebook_url, youtube_url,
  custom_link1_url, custom_link1_label, custom_link2_url, custom_link2_label
) on public.profiles to authenticated;

-- Users can see their own payment history...
create policy "Users can read their own payments"
on public.payments for select
using (auth.uid() = user_id);

-- ...and can only ever insert a *pending* payment as themselves.
-- Nobody except the server (via service_role, after verifying
-- Razorpay's cryptographic signature) can ever move a row to
-- 'captured' — no UPDATE policy is granted to `authenticated` on
-- purpose. Don't add one unless you fully understand what it unlocks.
create policy "Users can insert their own pending payments"
on public.payments for insert
with check (auth.uid() = user_id and status = 'created');

-- ---------------------------------------------------------
-- 6. Realtime — let clients subscribe to leaderboard changes
--    (Dashboard → Database → Replication also has a toggle
--    for this if you'd rather click it than run SQL.)
-- ---------------------------------------------------------
alter publication supabase_realtime add table public.profiles;

-- ---------------------------------------------------------
-- 7. Storage — profile pictures
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

create policy "Avatar images are publicly readable"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================================================
-- Done. Next: Table Editor → profiles / payments to eyeball
-- the empty tables, then sign up a user from the app to see
-- the on_auth_user_created trigger fire.
-- =========================================================
