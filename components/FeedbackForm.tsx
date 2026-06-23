'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { c, font, radius, card, label as themeLabel, input as themeInput, btn, muted } from '@/lib/theme'

// Client feedback form (Day 2). Lives in Settings. Clients report a bug, pitch
// an idea, or request a tweak; rows land in `feedback` for Ethan to triage at
// /admin/feedback. Insert-only — see supabase/feedback_daily.sql.

const TYPES: { value: string; label: string; hint: string }[] = [
  { value: 'bug', label: 'Bug', hint: 'Something’s broken or wrong' },
  { value: 'idea', label: 'Feature idea', hint: 'Something you wish it did' },
  { value: 'tweak', label: 'Tweak request', hint: 'Adjust how the AI behaves' },
]
const PRIORITIES = ['low', 'medium', 'high']

export default function FeedbackForm() {
  const [type, setType] = useState('bug')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [priority, setPriority] = useState('medium')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const fieldLabel: React.CSSProperties = { ...themeLabel, fontSize: '0.72rem', marginBottom: '0.4rem' }

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '0.45rem 1rem', borderRadius: radius.md, border: `1px solid ${active ? c.ink : c.border}`,
    background: active ? c.ink : c.surface, color: active ? '#fff' : c.muted,
    fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: font, transition: 'all 0.12s',
  })

  const submit = async () => {
    if (!title.trim()) { setError('Give it a short title first.'); return }
    setError('')
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    let clientId: string | null = null
    if (user) {
      const { data: client } = await supabase.from('clients').select('id').eq('email', user.email).maybeSingle()
      clientId = client?.id ?? null
    }

    const { error: insertError } = await supabase.from('feedback').insert({
      client_id: clientId,
      type,
      title: title.trim(),
      details: details.trim() || null,
      priority,
    })

    setSubmitting(false)
    if (insertError) {
      setError('Could not send that — please try again.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div style={card}>
        <p style={themeLabel}>Feedback</p>
        <div style={{ textAlign: 'center', padding: '1.5rem 0 0.5rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: c.goodBg, border: `1px solid ${c.goodBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.85rem', fontSize: '1.2rem' }}>✓</div>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: c.ink, marginBottom: '0.3rem' }}>Thanks — that’s in.</p>
          <p style={{ ...muted, marginBottom: '1.25rem' }}>Ethan reviews all feedback personally.</p>
          <button
            onClick={() => { setDone(false); setTitle(''); setDetails(''); setType('bug'); setPriority('medium') }}
            style={{ padding: '0.5rem 1.1rem', borderRadius: radius.md, border: `1px solid ${c.border}`, background: c.surface, color: c.muted, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, fontFamily: font }}
          >
            Send more
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={card}>
      <p style={themeLabel}>Feedback</p>
      <p style={{ ...muted, marginTop: '0.3rem', marginBottom: '1.25rem' }}>Spotted a bug, want a feature, or need the AI tweaked? Tell Ethan directly.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <p style={fieldLabel}>Type</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} style={chip(type === t.value)} title={t.hint}>{t.label}</button>
            ))}
          </div>
        </div>

        <div>
          <p style={fieldLabel}>Title</p>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="One line — what’s up?"
            maxLength={120}
            style={themeInput}
          />
        </div>

        <div>
          <p style={fieldLabel}>Details <span style={{ color: c.faint, fontWeight: 400 }}>(optional)</span></p>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Anything that helps — what you expected, what happened, an example…"
            rows={4}
            style={{ ...themeInput, resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        <div>
          <p style={fieldLabel}>Priority</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {PRIORITIES.map(p => (
              <button key={p} onClick={() => setPriority(p)} style={{ ...chip(priority === p), textTransform: 'capitalize' }}>{p}</button>
            ))}
          </div>
        </div>

        {error && <p style={{ color: c.bad, fontSize: '0.82rem' }}>{error}</p>}

        <button
          onClick={submit}
          disabled={submitting}
          style={{ ...btn, alignSelf: 'flex-start', opacity: submitting ? 0.5 : 1 }}
        >
          {submitting ? 'Sending…' : 'Send feedback'}
        </button>
      </div>
    </div>
  )
}
