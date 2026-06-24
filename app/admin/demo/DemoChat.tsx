'use client'

import { useState, useRef, useEffect } from 'react'
import { c, font, radius, card, label as themeLabel, input as themeInput, btn, muted } from '@/lib/theme'

// Admin demo replica (Day 3). An Instagram-style chat tester for recording
// content and showing prospects how the bot works. The right panel sets a
// throwaway persona (name / bio / avatar / voice instructions); typing a "DM"
// calls the real /api/reply with that persona. Nothing here touches clients.

interface Msg { from: 'them' | 'bot'; text: string }

const DEFAULT_INSTRUCTIONS = `You run an online fitness coaching business. Friendly, confident, casual — you talk like a real person texting, never corporate. When someone's interested, you qualify them (goals, timeline) and push toward booking a free intro call. If asked about price, you mention programs start around $200/month and ask what they're working toward.`

export default function DemoChat() {
  const [name, setName] = useState('@jakefitness')
  const [bio, setBio] = useState('Online fitness coach · 1:1 + group programs')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS)

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(m => [...m, { from: 'them', text }])
    setLoading(true)
    try {
      const voiceProfile = `Your name / handle: ${name}\nYour bio: ${bio}\n\nHow you communicate and what to say:\n${instructions}`
      const res = await fetch('/api/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, voiceProfile }),
      })
      const data = await res.json()
      setMessages(m => [...m, { from: 'bot', text: data.reply || '…' }])
    } catch {
      setMessages(m => [...m, { from: 'bot', text: 'Something went wrong generating a reply.' }])
    }
    setLoading(false)
  }

  const onAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatar(typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(file)
  }

  const initial = (name.replace('@', '').trim()[0] || '·').toUpperCase()
  const fieldLabel: React.CSSProperties = { ...themeLabel, fontSize: '0.72rem', marginBottom: '0.4rem' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem', alignItems: 'start' }}>

      {/* Instagram-style chat */}
      <div style={{ background: c.surface, borderRadius: radius.xl, border: `1px solid ${c.border}`, overflow: 'hidden', boxShadow: '0 8px 30px rgba(9,9,11,0.08)', maxWidth: 460 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.9rem 1.1rem', borderBottom: `1px solid ${c.border}`, background: c.surface }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', background: c.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>{initial}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: c.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || 'Your handle'}</p>
            <p style={{ fontSize: '0.72rem', color: c.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bio || 'Active now'}</p>
          </div>
          <span style={{ fontSize: '0.62rem', fontWeight: 600, color: c.good, background: c.goodBg, border: `1px solid ${c.goodBorder}`, padding: '0.15rem 0.45rem', borderRadius: radius.pill }}>DEMO</span>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ height: 420, overflowY: 'auto', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', background: c.bg }}>
          {messages.length === 0 && !loading && (
            <div style={{ margin: 'auto', textAlign: 'center', color: c.faint }}>
              <p style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>💬</p>
              <p style={{ fontSize: '0.82rem' }}>Send a message below to see how the bot replies.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.from === 'them' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '78%', padding: '0.6rem 0.85rem', fontSize: '0.875rem', lineHeight: 1.5,
                borderRadius: m.from === 'them' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: m.from === 'them' ? c.ink : c.surface,
                color: m.from === 'them' ? '#fff' : c.body,
                border: m.from === 'them' ? 'none' : `1px solid ${c.border}`,
                whiteSpace: 'pre-wrap',
              }}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '0.7rem 0.9rem', borderRadius: '16px 16px 16px 4px', background: c.surface, border: `1px solid ${c.border}`, display: 'flex', gap: '4px' }}>
                {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: c.faint, animation: `walterpulse 1.4s ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: '0.6rem', padding: '0.8rem 1rem', borderTop: `1px solid ${c.border}`, background: c.surface }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Message…"
            style={{ ...themeInput, borderRadius: radius.pill, padding: '0.55rem 1rem' }}
          />
          <button onClick={send} disabled={loading || !input.trim()} style={{ ...btn, borderRadius: radius.pill, padding: '0.55rem 1.1rem', opacity: loading || !input.trim() ? 0.5 : 1 }}>Send</button>
        </div>
      </div>

      {/* Settings panel */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div>
          <p style={themeLabel}>Demo persona</p>
          <p style={{ ...muted, marginTop: '0.3rem', fontSize: '0.8rem' }}>Throwaway — nothing here affects real clients.</p>
        </div>

        <div>
          <p style={fieldLabel}>Profile name / handle</p>
          <input value={name} onChange={e => setName(e.target.value)} style={themeInput} />
        </div>

        <div>
          <p style={fieldLabel}>Bio</p>
          <input value={bio} onChange={e => setBio(e.target.value)} style={themeInput} />
        </div>

        <div>
          <p style={fieldLabel}>Profile picture</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: c.surfaceAlt, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: c.faint, fontSize: '0.85rem', fontWeight: 600 }}>{initial}</span>}
            </div>
            <label style={{ ...btn, background: c.surface, color: c.body, border: `1px solid ${c.border}`, cursor: 'pointer', fontSize: '0.8rem' }}>
              Upload
              <input type="file" accept="image/*" onChange={onAvatar} style={{ display: 'none' }} />
            </label>
            {avatar && <button onClick={() => setAvatar(null)} style={{ background: 'none', border: 'none', color: c.faint, fontSize: '0.78rem', cursor: 'pointer', fontFamily: font }}>clear</button>}
          </div>
        </div>

        <div>
          <p style={fieldLabel}>Voice instructions</p>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={7} style={{ ...themeInput, resize: 'vertical', lineHeight: 1.55 }} />
          <p style={{ color: c.faint, fontSize: '0.72rem', marginTop: '0.35rem' }}>How the bot should talk + what to say. This is the persona it replies as.</p>
        </div>

        <button onClick={() => setMessages([])} style={{ ...btn, background: c.surface, color: c.muted, border: `1px solid ${c.border}` }}>Reset chat</button>
      </div>
    </div>
  )
}
