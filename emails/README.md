# Retention email sequence

Ready-to-send templates for the first 30 days and beyond. The goal: keep new
clients engaged, catch problems early (while they're still inside the 14-day
setup-fee window), and make tweaks feel easy — so they stay.

**Right now these are send-manually** (copy → your email client). Once a domain +
Resend SMTP are set up, they can be automated off `clients.created_at`.

## Cadence

| When | File | Purpose |
|------|------|---------|
| Day 0 (onboarded) | [00-welcome.md](00-welcome.md) | "You're live" — set expectations |
| Day 1–2 | [01-day1-checkin.md](01-day1-checkin.md) | "How's it treating you?" — catch issues early |
| Day 3 | [02-day3-tweaks.md](02-day3-tweaks.md) | Offer easy tweaks |
| Day 7 | [03-day7-recap.md](03-day7-recap.md) | First-week recap (numbers) |
| Day 14 | [04-day14-midmonth.md](04-day14-midmonth.md) | Momentum + reassurance |
| Day 21 | [05-day21-optimize.md](05-day21-optimize.md) | One optimization nudge |
| Day 30 | [06-day30-recap.md](06-day30-recap.md) | Month scoreboard + next goal |
| Monthly | [07-monthly-checkin.md](07-monthly-checkin.md) | Recurring recap |

## Merge fields

Replace these before sending (or wire them up when automating):

- `{{first_name}}` — client's first name
- `{{dm_count}}` — DMs handled in the period
- `{{lead_count}}` — leads captured in the period
- `{{pipeline_value}}` — estimated pipeline value (from the dashboard)

## Voice

Write like Ethan texts: casual, direct, a real person — not a marketing robot.
Short. One clear ask per email. Always "just hit reply."
