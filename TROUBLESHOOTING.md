# Walter & Co — Troubleshooting Guide

Practical fixes for when something isn't working. The most common report by far is
**"the bot isn't replying to DMs."** Start there.

---

## 🔴 The bot isn't replying to messages

Walter only auto-replies when **every** link in this chain is healthy. Work down the
list — they're ordered most-common-first.

### 1. Instagram privacy / message-access settings (the #1 cause)

Meta will silently stop delivering DMs to Walter if the account's message-access
permission is off. On the Instagram **mobile app**, on the connected account:

- **Settings and privacy → Messages and story replies → Connected tools →
  _Allow access to messages_ must be ON.**
- The account must be a **Professional account** — either **Business** or **Creator**
  (a personal account cannot connect messaging). Settings → Account type and tools.
- The account should be **linked to a Facebook Page** if you used the Facebook-login
  path (not required for the Instagram-login path, but Meta sometimes still asks).
- If you just turned the toggle on, send a fresh test DM from a *different* account —
  Meta won't backfill messages that arrived while access was off.

> If a client says "it stopped working," 9 times out of 10 they (or Instagram during an
> app update) flipped **Allow access to messages** off. Check this first.

### 2. The conversation is paused (this is often "working as intended")

Walter goes quiet for an individual person in several cases. Check the **Inbox** — each
conversation has an AI on/off switch and a status badge:

| Badge / reason | What it means | How it resumes |
|---|---|---|
| **You're handling it** (`owner`) | You replied to that DM by hand from Instagram, so Walter stepped aside. | Flip the AI switch back **on** in the Inbox. |
| **Stepped back — time-waster** (`troll`) | Walter detected someone trolling / wasting time and disengaged. | Auto-resumes if they message with real buying intent — or switch it back on manually. |
| **They asked to stop** (`optout`) | The person said "stop messaging / not interested." | Auto-resumes only if they return with clear buying intent (e.g. "how much", "want to buy"). |
| **Stepped back — abusive** (`abuse`) | The person was abusive. | Same as opt-out — only clear buying intent re-opens it. |

If a whole client is silent (not just one person), it's **not** a pause — keep going.

### 3. Instagram access token expired or wrong

Long-lived Instagram tokens **expire about every 60 days** and must be refreshed.

- Open **Dashboard → Connections** (`/dashboard/connections`) — it runs a live health
  check against the Graph API and shows whether the token is valid.
- Or hit `/api/instagram/status` directly.
- If invalid: paste a fresh long-lived token in the admin client page
  (Admin → Clients → that client → access token), and confirm the
  **Instagram account ID** matches the connected account.

### 4. The 24-hour messaging window

Instagram's platform policy only lets a business send a message **within 24 hours of the
user's last message** (the "standard messaging window"). Outside that window the send is
rejected by Meta even though Walter generated a reply.

- **Live replies** to someone who just DM'd you are fine (you're inside the window).
- **Automated follow-ups** (the daily "you went quiet" cron) can fail if the lead has
  been silent more than 24h — that's a platform limit, not a bug.

### 5. Walter isn't finished setting up

On a brand-new client, the dashboard shows a **"Finish setting up"** checklist. Walter
won't reply until:

- **Voice profile** is trained (Dashboard → Voice Profile), and
- **Instagram** is connected (Dashboard → Connections).

### 6. Webhook not subscribed / verify token mismatch

If DMs never reach the app at all (nothing appears in the Inbox), the Meta webhook isn't
wired:

- In the Meta app dashboard, the webhook must be **subscribed to the `messages` field**.
- The callback URL is `https://<your-domain>/api/instagram/webhook`.
- The **Verify Token** in Meta must equal `WEBHOOK_VERIFY_TOKEN` in the env.
- The Meta app must be **Live**, not in Development mode (Development mode only delivers
  events for users with a role on the app).

### 7. Anthropic API key missing / out of credits

Walter writes replies with the Claude API. If `ANTHROPIC_API_KEY` is unset, invalid, or
the account is out of credits, generation fails and nothing is sent. Check the Vercel
function logs for the webhook route for `401`/`429` errors.

### 8. Only text DMs are handled

Walter replies to **text** DMs. Story replies, voice notes, image-only messages, shares,
and reactions don't trigger a reply by design.

---

## Quick triage checklist

Run through this in order — stop at the first "no":

1. Is **Allow access to messages** ON in Instagram, and is it a Business/Creator account?
2. Does the DM show up in the **Inbox**? (No → webhook/token problem, §3 & §6.)
3. Is the conversation's **AI switch ON** / not paused? (§2)
4. Is the **token valid** on Dashboard → Connections? (§3)
5. Is the inbound message **less than 24h** old? (§4)
6. Is **setup finished** (voice + Instagram)? (§5)
7. Any `401`/`429` in the **webhook logs**? (§7 — key/credits)

---

## Other common issues

**"A lead's estimated value looks way too high."**
Fixed: each person now counts as **one** lead (not a new lead per message), and the
intent score is driven by concrete buying signals — not by how many times someone says
"interested." If an old number still looks inflated, mark the duplicate/stale leads as
*dismissed*; the pipeline total only counts open leads, one per person.

**"Walter replied once then went silent to that person."**
That conversation is paused. Check the Inbox badge (§2) — most likely you replied by hand
(which intentionally hands the chat to you), or they were flagged as a time-waster.

**"Can't log in / keeps bouncing to /login."**
Auth is cookie-based. Make sure cookies aren't blocked for the site, try the
**Remember me** box on the login screen, and use **Forgot password?** to reset if needed.

**"Follow-up DMs aren't going out."**
The daily follow-up cron only messages leads who (a) are still `new`, (b) haven't already
been followed up, (c) aren't paused, and (d) are inside Instagram's 24h window (§4).

**"Replies are slow."**
Check **Settings → Reply delay**. A delay is intentional (it feels human); a value of 0
sends immediately.

---

## Where to look

- **Live token / connection health:** Dashboard → Connections, or `/api/instagram/status`
- **Per-conversation AI state:** Dashboard → Inbox (switch + badge per person)
- **Server errors:** Vercel → the project → Logs, filter to `/api/instagram/webhook`
- **In-app version of this guide for clients:** Dashboard → **Help** (`/dashboard/help`)

Still stuck? Email **ethanvonl@icloud.com** with the client name, the sender's @handle,
and roughly when the DM was sent.
