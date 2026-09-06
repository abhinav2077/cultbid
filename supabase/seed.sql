-- =========================================================
-- Optional demo seed data.
--
-- total_paid is normally only ever changed via the payments
-- trigger — but this script runs as the `postgres` role in
-- the SQL editor, which bypasses RLS/grants entirely, so it's
-- fine to insert directly here for seeding a demo.
--
-- NOTE: this creates `profiles` rows with random UUIDs that
-- are NOT backed by real auth.users rows, purely so you can
-- see a populated leaderboard. Don't run this against a
-- production project with real users — stick to signups there.
-- =========================================================

insert into public.profiles (id, username, name, bio, total_paid, instagram_url, twitter_url)
select
  gen_random_uuid(),
  'creator_' || i,
  'Creator ' || i,
  'Demo profile seeded for testing.',
  round((power(101 - i, 1.6) * 38 + random() * 500)::numeric, 2),
  'https://instagram.com/creator_' || i,
  'https://twitter.com/creator_' || i
from generate_series(1, 100) as i;
