# cultbid.in

A black-themed, real-time influencer bidding leaderboard, now backed by a real Supabase database: real signups, real profiles, real payments, real-time reordering pushed from Postgres to every connected browser.

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion + Supabase (Postgres, Auth, Storage, Realtime).

## Table structure

One table (`profiles`) holds everything social-bid-related; `auth.users` (built into Supabase) holds email + password. **You don't get a `password` column in `profiles`** — Supabase Auth already hashes and stores it for you (bcrypt), which is strictly better than rolling your own encrypt/decrypt.

```
auth.users (Supabase-managed)
  id, email, encrypted_password, ...

public.profiles                          public.payments
  id            uuid  PK, = auth.users.id   id          uuid PK
  username      text  unique                user_id     uuid  → profiles.id
  name          text                        amount      numeric
  bio           text                        created_at  timestamptz
  gender        text (enum-checked)
  avatar_path   text  (path in "avatars" storage bucket)
  instagram_url, twitter_url, facebook_url, youtube_url  text
  custom_link1_url, custom_link1_label                   text
  custom_link2_url, custom_link2_label                   text
  total_paid    numeric  ← never written directly by clients
  created_at    timestamptz
```

Why two tables instead of just a `total_paid` column you update directly: `payments` is an append-only ledger (one row per payment — an audit trail, and the source of truth if you ever need to reconcile against a real payment gateway). A Postgres trigger sums it into `profiles.total_paid` automatically, so the leaderboard number and the ledger can never drift apart, and a `total_paid` update can never happen without a payment row backing it.

**Why `profiles.total_paid` can't be edited by a malicious client:** a Postgres column-level `GRANT` explicitly excludes it from what the `authenticated` role can write — this is enforced by Postgres itself, not just a UI restriction. Full detail is commented in `supabase/schema.sql`.

## Step-by-step Supabase setup

1. **Create a project** at [supabase.com](https://supabase.com) → New Project. Free tier is plenty for this. Pick a region close to your users, set a database password (this is Postgres's own admin password — unrelated to your app's user passwords), and wait ~2 minutes for it to provision.

2. **Run the schema.** In your project: **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql` from this project, and click **Run**. This creates both tables, the triggers, all Row Level Security policies, enables Realtime on `profiles`, and sets up the `avatars` storage bucket with its access policies — everything, in one script.

3. **(Optional) Seed some demo data.** If you want a populated 100-row leaderboard before any real signups exist, run `supabase/seed.sql` the same way. Skip this for a real launch — just let real signups populate it.

4. **Get your API keys.** **Project Settings → API**. You need the **Project URL** and the **anon / public key** (not the `service_role` key — that one should never reach the browser or this app).

5. **Set your env vars.** In the project root:
   ```bash
   cp .env.local.example .env.local
   ```
   and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

6. **(Recommended for local dev) Turn off email confirmation**, so signups log you in immediately instead of waiting on a confirmation email: **Authentication → Providers → Email → toggle "Confirm email" off**. Turn it back on before a real launch.

7. **Install and run:**
   ```bash
   npm install
   npm run dev
   ```
   Open `localhost:3000` — you'll be redirected to `/signup`. Create an account, and you'll land on the (now real, DB-backed) leaderboard.

8. **See the real-time animation:** open the app in two browser windows (or two devices), signed in as two different users. Pay from one — the other window's card glides to its new position within a second or two, no refresh.

## What each piece does

- **`supabase/schema.sql`** — the entire DB setup: tables, triggers, RLS, storage policies, Realtime. Read top to bottom — every block is commented with *why*, not just *what*.
- **`supabase/seed.sql`** — optional demo data for a populated leaderboard without real signups.
- **`lib/supabase/client.ts`** — browser Supabase client, used in Client Components.
- **`lib/supabase/server.ts`** — server Supabase client for Server Components and API routes, reads the session from cookies.
- **`middleware.ts` + `lib/supabase/middleware.ts`** — refreshes the auth session on every request and redirects signed-out visitors to `/login`.
- **`lib/useLeaderboard.ts`** — fetches `profiles` once, then subscribes to Postgres changes via Supabase Realtime. Any insert/update anywhere re-sorts the local list; the `layout` animation on each card does the rest.
- **`app/api/pay/route.ts`** — the only place a payment gets recorded. Validates the session server-side, inserts into `payments`; the DB trigger takes it from there. This is exactly where you'd plug in a real payment gateway's webhook confirmation before the insert.
- **`app/api/profile/route.ts`** — profile edits, restricted to an explicit allow-list of editable columns.
- **`app/login`, `app/signup`** — Supabase Auth email/password flows.
- **`app/profile/edit`** — bio, social links, and avatar upload (straight to Supabase Storage's `avatars` bucket).
- **`app/auth/callback/route.ts`** — handles the email confirmation link redirect.

## Making it production-real

- **Payments**: `app/api/pay/route.ts` currently records a payment the instant the modal is confirmed — there's no actual money involved yet. Wire in Razorpay/Stripe/etc., verify their webhook signature server-side, and only call the `payments` insert after that webhook confirms a successful charge.
- **Email confirmation**: turn "Confirm email" back on in Supabase Auth settings before launch, so signups are verified.
- **Rate limiting**: `/api/pay` has no rate limit — add one (Supabase Edge Functions, Vercel's rate limiting, or a simple DB check) before this is public, so no one can hammer the endpoint.
- **Custom domain / email templates**: Authentication → Settings, once you're ready to send real confirmation/reset emails from `cultbid.in`.

## Design notes (unchanged from the static version)

- Type: Bricolage Grotesque (display), Inter (body), JetBrains Mono (all currency figures and ranks — tabular numbers).
- Palette: near-black `#08080a` base, neon pink `#ff2ea6` accent used sparingly.
- Rank glow: animated gradient border + pulsing box-shadow for ranks 1–3.
- All animations respect `prefers-reduced-motion`.

## Setting up Razorpay (Indian payments)

### How the payment flow actually works

Money changes hands in the browser (Razorpay's hosted checkout), but **your server never trusts anything the browser reports back until it's cryptographically verified**. Concretely:

1. You click Pay → your server calls Razorpay's Orders API, creating an order and a `payments` row with `status: 'created'`.
2. Razorpay's checkout modal opens client-side using that order ID.
3. You pay. Razorpay hands the browser back a payment ID, order ID, and a signature.
4. Your server re-computes that signature itself (HMAC-SHA256, using your secret key) and compares it — only if it matches does the `payments` row move to `status: 'captured'`, which is the only thing that ever increments `total_paid` (via the DB trigger).
5. **Webhook, independently:** Razorpay also calls your server directly (not through the browser) when a payment captures or fails. This is what catches the case where someone pays but closes the tab before step 4 runs — without it, Razorpay would have the money and your database would never know.

Two different secrets verify two different things: your **API key_secret** verifies the checkout-success signature (step 4), your **webhook secret** verifies webhook calls (step 5) — don't mix them up, and never let either one reach the browser. Only `RAZORPAY_KEY_ID` (not `KEY_SECRET`) is meant to be public.

### Step-by-step setup

1. **Create a Razorpay account** at [razorpay.com](https://razorpay.com) → Sign Up. Free — no monthly fee, they only take a per-transaction cut once you're live. You get full **Test Mode** immediately, no KYC needed yet.

2. **Grab your test API keys.** Dashboard → **Settings → API Keys** → **Generate Test Key**. Copy the Key ID (`rzp_test_...`) and Key Secret.

3. **Add them to `.env.local`:**
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your-test-key-secret
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   ```

4. **Get your Supabase service role key** (needed so the server can mark a payment 'captured' after verifying it — this is a different, more powerful key than the anon key you already have). Supabase Dashboard → **Project Settings → API** → copy the **`service_role`** key (it's marked secret — treat it like a password) into:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

5. **Run the DB migration.** Supabase → SQL Editor → paste and run `supabase/2_razorpay_migration.sql`. This adds the payment-status lifecycle and tightens the RLS policy so a client can never mark its own payment as captured.

6. **Set up the webhook** so payments aren't lost if someone closes the tab mid-payment:
   - Razorpay's servers can't reach `localhost`, so for local testing, run a tunnel:
     ```bash
     npx cloudflared tunnel --url http://localhost:3000
     ```
     (free, no signup — or use `ngrok http 3000` if you already have it). Copy the `https://...` URL it gives you.
   - Razorpay Dashboard → **Account & Settings → Webhooks → Add New Webhook**.
   - Webhook URL: `<your tunnel URL>/api/razorpay/webhook` (or, once deployed, `https://cultbid.in/api/razorpay/webhook`).
   - Active events: check **`payment.captured`** and **`payment.failed`**.
   - Set a webhook secret (any string you choose) and save — copy that same secret into:
     ```
     RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
     ```

7. **Test it end to end:** `npm run dev`, click Pay, enter an amount, and use Razorpay's test card **4111 1111 1111 1111**, any future expiry, any CVV — or test UPI ID **`success@razorpay`**. You should land back on the leaderboard with your total updated. Check the Razorpay Dashboard → Webhooks → your webhook → you'll see the delivery logged there too.

### Going live (accepting real money)

- **Complete KYC**: Razorpay Dashboard → **Activate your account**. For an individual/sole proprietor you'll need your PAN, a photo/scan of your Aadhaar, and your bank account details. Typically approved within 1–2 working days for clean documents.
- Once activated, generate **live** keys (`rzp_live_...`) the same way you did test keys, and swap them into your **production** environment variables (Vercel → Project Settings → Environment Variables) — keep your local `.env.local` on test keys so you're never accidentally testing with real money.
- **Re-create the webhook in Live Mode** — test-mode webhooks don't carry over; you need a second one pointed at your real domain with live-mode events enabled.
- Payments settle to your bank account on Razorpay's standard settlement cycle (T+2 working days by default) — this doesn't require any code changes, it's purely a dashboard/banking detail.
- Test one real ₹1 payment end-to-end on production before announcing anything.

### A note on what "amount" means here

Right now, the amount someone pays is whatever they type into the Pay modal — there's no fixed "price" being purchased, it's literally their bid. That's intentional for this app, but it does mean the amount is user-supplied and only bounded by `amount > 0`. If you want a minimum bid, a maximum, or fixed tiers, that validation belongs in `app/api/razorpay/create-order/route.ts`, right where `amount` is currently read from the request body.
