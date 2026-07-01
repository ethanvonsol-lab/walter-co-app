'use client'

import Sidebar from '@/components/Sidebar'
import { c, font, radius, card, label, pageTitle } from '@/lib/theme'

// Client-facing troubleshooting page. The full owner guide lives in
// TROUBLESHOOTING.md; this is the friendly, self-serve version for clients —
// almost every "it's not working" ticket is one of the items below.

interface Item { q: string; a: React.ReactNode }

const NOT_REPLYING: Item[] = [
  {
    q: '1. Check your Instagram message-access setting (most common)',
    a: (
      <>
        On the Instagram app, on the account Walter manages, go to{' '}
        <strong>Settings and privacy → Messages and story replies → Connected tools</strong> and make
        sure <strong>“Allow access to messages” is ON</strong>. Instagram sometimes switches this off
        after an app update — when it’s off, your DMs never reach Walter. Your account also needs to be
        a <strong>Professional account</strong> (Business or Creator), not a personal one.
      </>
    ),
  },
  {
    q: '2. Is the conversation paused?',
    a: (
      <>
        Open your <a href="/dashboard/inbox" style={{ color: c.ink }}>Inbox</a>. Each chat has an AI
        on/off switch. Walter goes quiet for a person when <strong>you reply to them by hand</strong>{' '}
        (it hands that chat to you), or when it detects a <strong>time-waster</strong> or someone who{' '}
        <strong>asked to stop</strong>. Flip the switch back on to resume, or it auto-resumes if a
        time-waster later shows real buying interest.
      </>
    ),
  },
  {
    q: '3. Is your Instagram connection healthy?',
    a: (
      <>
        Instagram access tokens expire roughly every 60 days. Open{' '}
        <a href="/dashboard/connections" style={{ color: c.ink }}>Connections</a> — it runs a live
        health check and tells you if the connection needs refreshing. If it’s red, reconnect (or send
        us a quick message and we’ll sort it).
      </>
    ),
  },
  {
    q: '4. Was the DM more than 24 hours old?',
    a: (
      <>
        Instagram only lets businesses message someone within <strong>24 hours</strong> of that
        person’s last message. Walter always replies to fresh DMs, but an automated “you went quiet”
        follow-up can’t be sent if the person has been silent for over a day — that’s an Instagram rule,
        not a glitch.
      </>
    ),
  },
  {
    q: '5. Have you finished setting up?',
    a: (
      <>
        Walter starts replying once your <a href="/dashboard/voice" style={{ color: c.ink }}>Voice
        Profile</a> is trained and your <a href="/dashboard/connections" style={{ color: c.ink }}>
        Instagram</a> is connected. If you still see the “Finish setting up” checklist on your
        dashboard, complete those two steps.
      </>
    ),
  },
]

const OTHER: Item[] = [
  {
    q: 'Walter replied once, then went silent to that person',
    a: <>That chat is paused — almost always because you replied to them yourself from Instagram, which intentionally hands the conversation to you. Turn the AI switch back on in the Inbox to resume.</>,
  },
  {
    q: 'A lead’s estimated value looks too high',
    a: <>Each person counts as one lead, and the intent score is based on real buying signals (asking price, wanting to book or buy, leaving contact details) — not on how often they say “interested.” If an old lead still looks off, mark it <em>dismissed</em> and it drops out of your pipeline total.</>,
  },
  {
    q: 'I can’t log in / it keeps returning to the login page',
    a: <>Make sure your browser allows cookies for this site, tick <strong>Remember me</strong> on the login screen, and use <strong>Forgot password?</strong> to reset if needed.</>,
  },
  {
    q: 'Replies feel slow',
    a: <>There’s a built-in reply delay so messages feel human. You can change it under <a href="/dashboard/settings" style={{ color: c.ink }}>Settings → Reply delay</a> (set it to 0 to send instantly).</>,
  },
]

function Section({ title, items }: { title: string; items: Item[] }) {
  return (
    <div style={{ ...card, marginBottom: '1rem' }}>
      <p style={{ ...label, marginBottom: '1.1rem' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((it, i) => (
          <div key={i} style={{ padding: '1rem 0', borderTop: i > 0 ? `1px solid ${c.border}` : 'none' }}>
            <p style={{ fontSize: '0.92rem', fontWeight: 600, color: c.ink, marginBottom: '0.4rem' }}>{it.q}</p>
            <p style={{ fontSize: '0.875rem', color: c.body, lineHeight: 1.65 }}>{it.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HelpPage() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: font, background: c.bg }}>
      <Sidebar active="Help" />

      <main style={{ marginLeft: '244px', flex: 1, padding: '2.25rem 2.5rem', maxWidth: 880 }}>
        <div style={{ paddingBottom: '1.1rem', borderBottom: `1px solid ${c.border}`, marginBottom: '1.5rem' }}>
          <p style={{ ...label, marginBottom: '0.4rem' }}>Help &amp; Troubleshooting</p>
          <h1 style={{ ...pageTitle, fontSize: '1.75rem' }}>If something isn’t working</h1>
          <p style={{ color: c.muted, fontSize: '0.9rem', marginTop: '0.5rem', maxWidth: 620, lineHeight: 1.6 }}>
            Most issues are quick to fix. Start with the bot-not-replying checklist below — it’s ordered
            most-common-first.
          </p>
        </div>

        <Section title="Bot isn’t replying to DMs" items={NOT_REPLYING} />
        <Section title="Other common questions" items={OTHER} />

        <div style={{ ...card, borderColor: c.ink }}>
          <p style={{ ...label, color: c.ink, marginBottom: '0.4rem' }}>Still stuck?</p>
          <p style={{ fontSize: '0.875rem', color: c.body, lineHeight: 1.65 }}>
            Email{' '}
            <a href="mailto:ethanvonl@icloud.com" style={{ color: c.ink, fontWeight: 500 }}>ethanvonl@icloud.com</a>{' '}
            with the person’s @handle and roughly when they messaged, and we’ll jump on it.
          </p>
        </div>
      </main>
    </div>
  )
}
