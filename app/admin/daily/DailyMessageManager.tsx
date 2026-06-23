'use client'

import { useState } from 'react'
import { c, font, radius, card, input as themeInput, btn, label as themeLabel, muted } from '@/lib/theme'

export interface DailyMessage {
  id: string
  message: string
  created_by: string | null
  created_at: string
}

export default function DailyMessageManager({ initial }: { initial: DailyMessage[] }) {
  const [messages, setMessages] = useState(initial)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const post = async () => {
    if (!text.trim()) return
    setError('')
    setPosting(true)
    const res = await fetch('/api/admin/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text.trim() }),
    })
    const data = await res.json()
    setPosting(false)
    if (!res.ok) { setError(data.error || 'Could not post.'); return }
    setMessages(m => [data.message as DailyMessage, ...m])
    setText('')
  }

  const remove = async (id: string) => {
    const prev = messages
    setMessages(m => m.filter(x => x.id !== id))
    const res = await fetch(`/api/admin/daily/${id}`, { method: 'DELETE' })
    if (!res.ok) setMessages(prev)
  }

  const latest = messages[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Composer */}
      <div style={card}>
        <p style={themeLabel}>New note</p>
        <p style={{ ...muted, marginTop: '0.3rem', marginBottom: '1rem' }}>Tip of the day, a heads-up, a bit of motivation. The newest note is the one clients see.</p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="e.g. Today’s tip: always qualify budget before you pitch."
          rows={3}
          maxLength={280}
          style={{ ...themeInput, resize: 'vertical', lineHeight: 1.6, marginBottom: '0.75rem' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={post} disabled={posting || !text.trim()} style={{ ...btn, opacity: posting || !text.trim() ? 0.5 : 1 }}>
            {posting ? 'Posting…' : 'Post note'}
          </button>
          <span style={{ fontSize: '0.74rem', color: c.faint }}>{text.length}/280</span>
          {error && <span style={{ color: c.bad, fontSize: '0.8rem' }}>{error}</span>}
        </div>
      </div>

      {/* Live preview of what clients see */}
      {latest && (
        <div style={card}>
          <p style={{ ...themeLabel, marginBottom: '0.75rem' }}>What clients see now</p>
          <div style={{ background: c.surfaceAlt, borderRadius: radius.md, padding: '1rem 1.15rem', borderLeft: `2px solid ${c.ink}` }}>
            <p style={{ fontSize: '0.72rem', color: c.muted, marginBottom: '0.4rem', fontWeight: 500 }}>📌 Today from Ethan</p>
            <p style={{ fontSize: '0.95rem', color: c.ink, fontStyle: 'italic', lineHeight: 1.55 }}>{latest.message}</p>
          </div>
        </div>
      )}

      {/* History */}
      <div style={card}>
        <p style={{ ...themeLabel, marginBottom: '1rem' }}>Recent notes</p>
        {messages.length === 0 ? (
          <p style={muted}>No notes yet — post your first one above.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {messages.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.85rem 0', borderTop: i > 0 ? `1px solid ${c.border}` : 'none' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.88rem', color: c.body, lineHeight: 1.5 }}>{m.message}</p>
                  <p style={{ fontSize: '0.72rem', color: c.faint, marginTop: '0.3rem' }}>
                    {new Date(m.created_at).toLocaleString()}{i === 0 ? ' · live now' : ''}
                  </p>
                </div>
                <button
                  onClick={() => remove(m.id)}
                  style={{ padding: '0.3rem 0.6rem', borderRadius: radius.sm, border: `1px solid ${c.border}`, background: c.surface, color: c.muted, cursor: 'pointer', fontSize: '0.74rem', fontFamily: font, flexShrink: 0 }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
