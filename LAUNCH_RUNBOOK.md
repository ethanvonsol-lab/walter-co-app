# Launch Day Runbook — Friday 2026-06-19, 8:00pm

Follow top to bottom. Nothing here is code — it's clicks + checks.

---

## PART A — Finish the Stripe live switch  (do first, ~15 min)

You've turned on Live mode. Now wire the live keys into the app.

1. **Live secret key**
   - Stripe (make sure the **Live** toggle is on) → **Developers → API keys**
   - Copy the **Secret key** (`sk_live_...`)
   - Vercel → project → Settings → Environment Variables → edit **`STRIPE_SECRET_KEY`** → paste the live key → Save

2. **Live webhook** (your test webhook does NOT work in live mode — make a new one)
   - Stripe (Live mode) → **Developers → Webhooks → Add endpoint**
   - URL: `https://walter-co-app.vercel.app/api/stripe/webhook`
   - Events (add these four):
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Save → open the endpoint → reveal **Signing secret** (`whsec_...`)
   - Vercel → edit **`STRIPE_WEBHOOK_SECRET`** → paste the live signing secret → Save

3. **Redeploy** so the new keys take effect
   - Vercel → Deployments → top deployment → ⋯ → **Redeploy**

---

## PART B — Prove live billing with a cheap real charge  (~5 min)

Don't test with the full $350+$500 — use a $1 dummy:

1. `/admin/clients/new` → create a client with your own email, **MRR = 1**, **Setup fee = 0** → Create
2. On their page → **Create payment link** → open it → pay with your **real card** ($1)
3. Refresh their admin page → Billing card should flip to **active** ✅
4. Clean up: Stripe → that payment → **Refund**; Stripe → the subscription → **Cancel**; then delete the test client in admin
5. If it flipped to active → **live billing works.** If not → check Stripe → Webhooks → your endpoint → recent deliveries for errors, and confirm `STRIPE_WEBHOOK_SECRET` matches + you redeployed.

---

## PART C — Final once-over  (~10 min, before 8pm)

On `walter-co-app.vercel.app`:
- [ ] Landing page loads, looks right
- [ ] `/login` → sign in as your admin account
- [ ] `/admin` loads (briefing populates after a few seconds — normal)
- [ ] `/dashboard` looks right
- [ ] **Send a test DM to your own @walterandco.ai Instagram → confirm Walter auto-replies** (this proves the core product still works in prod)

---

## PART D — Onboard a real client  (your repeatable playbook)

For each new paying client:
1. **Create** — `/admin/clients/new`: name, email, plan, **MRR**, **setup fee** → Create
2. **Password** — on their page, **Set login password** → share it with them → they sign in at `/login`
3. **Charge** — **Create payment link** → send it → they pay → auto-flips to active
4. **Connect Instagram** — paste their long-lived IG token + account ID in their Connections page (or yours, via admin edit)
5. **Voice** — have them complete `/onboarding` (or paste their answers into the voice profile)
6. Done — Walter starts replying to their DMs.

---

## PART E — Go live  🚀
- 8:00pm — announce / start selling.
- Keep an eye on `/admin` (fleet briefing, activity) and Stripe payments.

---

## If something breaks
- **Build/deploy failed** → Vercel → Deployments → open the failed one → Build Logs.
- **Payment didn't flip to active** → Stripe → Webhooks → endpoint → recent deliveries (look for non-200s). Usually a wrong/old `STRIPE_WEBHOOK_SECRET` or a missed redeploy.
- **`/admin` errors** → almost always a missing/typo'd `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
- **Client can't log in** → set their password again via the admin Set-password box.
- **A client's Instagram stopped replying** → `/admin/health` → Run health check → look for a broken token.

## Deferred (post-launch, not needed tonight)
Domain + Resend email, Instagram self-serve OAuth (Meta review), broken-token alert webhook, service-role key rotation.
