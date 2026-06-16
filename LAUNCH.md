# Walter & Co — Launch Checklist

Code is done. These are the steps that need **your** accounts (I can't do them for you).
Work top to bottom. See `.env.example` for every variable referenced.

---

## 1. Custom SMTP — so invite/reset emails stop hitting the rate limit  ⚠️ blocker

Supabase's built-in email is capped (~3–4/hour). Every client you onboard needs an
invite email, so you need your own sender.

1. Create a free account at **resend.com** → verify your sending domain (or use their
   test domain to start).
2. Resend → API Keys → copy the SMTP credentials (host, port, user, pass).
3. Supabase dashboard → **Project Settings → Authentication → SMTP Settings** →
   enable custom SMTP, paste the Resend values, set the "from" address.
4. Save. Send yourself a password reset from `/login` to confirm it arrives.

## 2. Rotate the service-role key  ⚠️ do before going public

The current `SUPABASE_SERVICE_ROLE_KEY` was pasted into a chat. Rotate it:

1. Supabase → **Project Settings → API → service_role → Reset**.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` **and** in Vercel (step 3).

## 3. Deploy to Vercel

1. Push this branch / merge to `main`. Import the repo in Vercel if you haven't.
2. Vercel → Project → **Settings → Environment Variables** — add every key from
   `.env.example` with real values (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_SITE_URL` = your prod URL (e.g. `https://walterandco.ai`)
   - `WEBHOOK_VERIFY_TOKEN`, `INSTAGRAM_ACCESS_TOKEN`
   - `CRON_SECRET` (any random string)
   - `ALERT_WEBHOOK_URL` (optional, step 8 below)
   - `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` (step 6 below, when ready)
3. Deploy. The nightly health-check cron in `vercel.json` activates automatically
   (runs 07:00 UTC). Vercel passes `CRON_SECRET` for you.

## 4. Supabase URL configuration  (makes email links work)

Supabase → **Authentication → URL Configuration**:
- **Site URL**: your prod URL (e.g. `https://walterandco.ai`)
- **Redirect URLs** — add all of these:
  - `https://YOUR-DOMAIN/set-password`
  - `http://localhost:3000/set-password` (for local testing)

Without this, invite/reset links error with "unauthorized redirect".

## 5. Run the SQL migrations (if not already)

In the Supabase SQL editor, run (once each):
- `supabase/admin.sql` — admin schema (is_admin, plan/mrr/avg_deal_value, audit_log, ig_health_snapshots)
- `supabase/conversation_settings.sql` — per-conversation AI toggle

Then flip yourself admin: `update clients set is_admin = true where email = 'you@email';`

## 6. Instagram self-serve OAuth  (the "Connect Instagram" button) — optional for v1

The code is built and live behind the button on `/dashboard/connections`. It needs a
Meta app to function:

1. **developers.facebook.com** → Create App → add the **Instagram API** product.
2. Configure **Instagram business login**:
   - Valid OAuth redirect URI: `https://YOUR-DOMAIN/api/instagram/oauth/callback`
   - Scopes: `instagram_business_basic`, `instagram_business_manage_messages`
3. Copy the app's ID/secret → set `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` in Vercel.
4. Submit for **App Review** for `instagram_business_manage_messages` (required to go
   beyond test users — Meta needs to approve message access).

Until this is set, clients use the **manual** connect option (paste token), which works today.

## 7. Per-client deal value  ✅ DONE (code)

Clients set their "average deal value" in **Settings**; it drives pipeline value on
the dashboard and leads. Admins can also set it per client in the admin panel.

## 8. Broken-token alerts  ✅ DONE (code) — just add a webhook

When the nightly health check finds a broken Instagram token, it posts to
`ALERT_WEBHOOK_URL` (works with Slack **or** Discord incoming webhooks).
- Slack: create an Incoming Webhook → paste the URL.
- Discord: Server Settings → Integrations → Webhooks → New → copy URL.
- Set `ALERT_WEBHOOK_URL` in Vercel. Leave blank to disable.

## 9. Stripe billing  ✅ BUILT (code) — needs your Stripe account

Automated subscription billing is wired. Each client is billed exactly the `mrr`
(monthly) + `setup_fee` (one-time) you set on their record — no Stripe price IDs to
manage. From a client's admin page, **"Create payment link"** generates a Stripe
Checkout URL you send them; when they pay, the webhook flips them to `active` and
keeps billing status in sync.

To turn it on:
1. Run `supabase/stripe.sql` in the Supabase SQL editor (adds the stripe columns).
2. Create a **Stripe account**. Stay in **Test mode** until launch day.
3. Stripe → Developers → **API keys** → copy the **Secret key** → set `STRIPE_SECRET_KEY`
   in `.env.local` and Vercel.
4. Stripe → Developers → **Webhooks** → Add endpoint:
   - URL: `https://YOUR-DOMAIN/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy the **Signing secret** (`whsec_…`) → set `STRIPE_WEBHOOK_SECRET`.
5. Test with Stripe's test card `4242 4242 4242 4242` (any future date / any CVC).
6. When ready for real money: toggle Stripe to **Live mode**, swap in the live
   `sk_live_…` key + a live webhook signing secret, redeploy.

## 10. End-to-end smoke test on prod  ⚠️ before first real client

1. Create a test client in `/admin/clients/new` (use an email you control).
2. Confirm the invite email arrives → click → set password → land on `/onboarding`.
3. Complete onboarding → land on `/dashboard/connections`.
4. Connect Instagram (manual paste, or OAuth if step 6 done).
5. Send a DM to the account → confirm Walter auto-replies and it shows in the inbox.
6. Delete the test client.
