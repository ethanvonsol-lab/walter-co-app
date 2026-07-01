'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { c, font, radius, card, label, pageTitle, tabular } from '@/lib/theme'

interface Message {
  id: string
  from_username: string
  from_handle?: string | null
  content: string
  ai_reply: string
  is_lead: boolean
  status: string
  type: string
  created_at: string
}

interface Conversation {
  username: string
  messages: Message[]
  last: Message
  count: number
  isLead: boolean
  score: number
  aiEnabled: boolean
  pausedReason: string | null
}

// Why a conversation is paused → how we label it. 'owner' (or a manual toggle)
// means you're handling it; the rest are people Walter stepped back from.
function pauseInfo(reason: string | null) {
  switch (reason) {
    case 'troll': return { badge: 'TIME-WASTER', detail: 'Walter stepped back — time-waster' }
    case 'optout': return { badge: 'OPTED OUT', detail: 'They asked to stop — Walter went quiet' }
    case 'abuse': return { badge: 'ABUSIVE', detail: 'Walter stepped back — abusive' }
    default: return { badge: 'YOU', detail: 'Paused — you reply' }
  }
}

// Lightweight buying-intent score (0-100) from message text — same signals the
// webhook flags on. Instant, no AI call.
function scoreMessage(content: string): number {
  const t = (content || '').toLowerCase()
  let score = 10
  const high = ['buy', 'purchase', 'book', 'sign up', 'signup', 'invest', 'hire', 'ready', 'join', 'enroll', 'work with', 'get started']
  const pricing = ['price', 'cost', 'how much', 'pricing', 'quote', 'rate', 'fee']
  const interest = ['interested', 'want', 'looking', 'need', 'keen', 'curious', 'info', 'details', 'available']
  if (high.some(k => t.includes(k))) score += 45
  if (pricing.some(k => t.includes(k))) score += 25
  if (interest.some(k => t.includes(k))) score += 15
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(t)) score += 20
  return Math.max(0, Math.min(100, score))
}

const intentTone = (score: number) =>
  score >= 70 ? { label: 'Hot', bg: c.ink, color: '#fff' }
  : score >= 40 ? { label: 'Warm', bg: c.surfaceAlt, color: c.body }
  : { label: 'Low', bg: c.surfaceAlt, color: c.faint }

// Small on/off switch (matches the Settings toggle).
function AiSwitch({ on, onClick, size = 'sm' }: { on: boolean; onClick: (e: React.MouseEvent) => void; size?: 'sm' | 'md' }) {
  const w = size === 'md' ? 44 : 34
  const knob = size === 'md' ? 16 : 12
  return (
    <button
      onClick={onClick}
      aria-label={on ? 'AI on' : 'AI off'}
      style={{ width: `${w}px`, height: `${knob + 8}px`, borderRadius: '999px', border: 'none', background: on ? '#22c55e' : '#d4d4d8', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
    >
      <div style={{ width: `${knob}px`, height: `${knob}px`, borderRadius: '50%', background: '#fff', position: 'absolute', top: '4px', left: on ? `${w - knob - 4}px` : '4px', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
    </button>
  )
}

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [aiMap, setAiMap] = useState<Record<string, boolean>>({})
  const [reasonMap, setReasonMap] = useState<Record<string, string | null>>({})
  const [handleMap, setHandleMap] = useState<Record<string, string>>({})
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [clientId, setClientId] = useState('')

  const [draft, setDraft] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: client } = await supabase.from('clients').select('id').eq('email', user.email).maybeSingle()
      if (!client) { setLoading(false); return }
      setClientId(client.id)

      const { data } = await supabase
        .from('messages').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
      if (data) {
        setMessages(data)
        if (data.length > 0) setSelectedUser(data[0].from_username)

        // Seed @handles already cached on the rows, then lazily resolve any
        // conversation still showing a numeric IGSID.
        const seed: Record<string, string> = {}
        data.forEach((m: Message) => { if (m.from_handle) seed[m.from_username] = m.from_handle })
        setHandleMap(seed)
        const unresolved = [...new Set(data.map((m: Message) => m.from_username))].filter(u => !seed[u] && /^\d+$/.test(u))
        unresolved.forEach(igsid => {
          fetch('/api/instagram/resolve-handle', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: client.id, igsid }),
          })
            .then(r => r.json())
            .then(({ handle }) => { if (handle) setHandleMap(prev => ({ ...prev, [igsid]: handle })) })
            .catch(() => {})
        })
      }

      // Per-conversation AI switches (table may not exist yet — fail soft).
      const { data: settings } = await supabase
        .from('conversation_settings').select('from_username, ai_enabled, paused_reason').eq('client_id', client.id)
      if (settings) {
        const map: Record<string, boolean> = {}
        const reasons: Record<string, string | null> = {}
        settings.forEach((s: { from_username: string; ai_enabled: boolean; paused_reason?: string | null }) => {
          map[s.from_username] = s.ai_enabled
          reasons[s.from_username] = s.paused_reason ?? null
        })
        setAiMap(map)
        setReasonMap(reasons)
      }
      setLoading(false)

      const channel = supabase
        .channel('messages-channel')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${client.id}`
        }, (payload) => {
          const m = payload.new as Message
          setMessages(prev => [m, ...prev])
          if (m.from_handle) setHandleMap(prev => ({ ...prev, [m.from_username]: m.from_handle as string }))
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [])

  const toggleAi = async (username: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !(aiMap[username] ?? true)
    // Manually flipping the switch = you're handling it (or handing it back).
    const reason = next ? null : 'owner'
    setAiMap(prev => ({ ...prev, [username]: next })) // optimistic
    setReasonMap(prev => ({ ...prev, [username]: reason }))
    try {
      await supabase.from('conversation_settings').upsert(
        { client_id: clientId, from_username: username, ai_enabled: next, paused_reason: reason, updated_at: new Date().toISOString() },
        { onConflict: 'client_id,from_username' }
      )
    } catch {
      /* table not created yet — UI stays optimistic */
    }
  }

  // Group messages into conversations by sender.
  const convMap: Record<string, Message[]> = {}
  messages.forEach(m => { (convMap[m.from_username] ||= []).push(m) })
  const conversations: Conversation[] = Object.entries(convMap).map(([username, msgs]) => {
    const sorted = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const lastInbound = [...sorted].reverse().find(m => m.content) || sorted[sorted.length - 1]
    return {
      username,
      messages: sorted,
      last: sorted[sorted.length - 1],
      count: sorted.length,
      isLead: msgs.some(m => m.is_lead),
      score: scoreMessage(lastInbound.content),
      aiEnabled: aiMap[username] ?? true,
      pausedReason: reasonMap[username] ?? null,
    }
  }).sort((a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime())

  const filtered = conversations.filter(c => {
    if (filter === 'leads') return c.isLead
    if (filter === 'paused') return !c.aiEnabled
    return true
  })

  const selected = conversations.find(c => c.username === selectedUser) || null

  const selectConversation = (username: string) => {
    setSelectedUser(username); setDraft(''); setCopied(false)
  }

  const handleDraft = async () => {
    if (!selected) return
    const lastInbound = [...selected.messages].reverse().find(m => m.content) || selected.last
    setDrafting(true); setDraft(''); setCopied(false)
    try {
      const res = await fetch('/api/followup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, username: selected.username, lastMessage: lastInbound.content, lastReply: lastInbound.ai_reply }),
      })
      const data = await res.json()
      setDraft(data.followup || data.error || 'No draft returned.')
    } catch { setDraft("Walter couldn't draft a follow-up right now.") }
    setDrafting(false)
  }

  const copyDraft = () => { navigator.clipboard?.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  const timeAgo = (date: string) => {
    // eslint-disable-next-line react-hooks/purity -- relative timestamp, fine to recompute on render
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const pausedCount = conversations.filter(c => !c.aiEnabled).length
  // Show the resolved @handle when we have it, otherwise the raw id.
  const nameFor = (u: string) => handleMap[u] || u

  const filterChip = (active: boolean): React.CSSProperties => ({
    padding: '0.3rem 0.85rem', borderRadius: radius.pill, border: `1px solid ${active ? c.ink : c.border}`,
    background: active ? c.ink : 'transparent', color: active ? '#fff' : c.muted,
    fontSize: '0.7rem', fontWeight: 500, textTransform: 'capitalize', cursor: 'pointer', fontFamily: font,
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: font, background: c.bg }}>
      <Sidebar active="Inbox" />

      <main style={{ marginLeft: '244px', flex: 1, display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Conversation List */}
        <div style={{ width: '380px', background: c.surface, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <div style={{ padding: '1.75rem 1.5rem', borderBottom: `1px solid ${c.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <p style={label}>Inbox</p>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem', color: c.faint }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'walterpulse 1.6s ease-in-out infinite' }} /> live
              </span>
            </div>
            <h1 style={{ ...pageTitle, fontSize: '1.4rem', marginBottom: '0.3rem' }}>Conversations</h1>
            <p style={{ color: c.muted, fontSize: '0.78rem', marginBottom: '1rem' }}>{conversations.length} people{pausedCount > 0 ? ` · ${pausedCount} you're handling` : ''}</p>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {['all', 'leads', 'paused'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={filterChip(filter === f)}>{f}</button>
              ))}
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: c.faint, fontSize: '0.85rem' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', color: c.faint }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💬</p>
                <p style={{ fontSize: '0.85rem' }}>No conversations{filter !== 'all' ? ' in this view' : ' yet'}</p>
              </div>
            ) : filtered.map(conv => {
              const tone = intentTone(conv.score)
              return (
                <div
                  key={conv.username}
                  onClick={() => selectConversation(conv.username)}
                  style={{
                    padding: '1rem 1.5rem', borderBottom: `1px solid ${c.border}`, cursor: 'pointer',
                    background: selectedUser === conv.username ? c.surfaceAlt : c.surface,
                    borderLeft: selectedUser === conv.username ? `2px solid ${c.ink}` : '2px solid transparent',
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 500, color: c.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{nameFor(conv.username)}</p>
                    <AiSwitch on={conv.aiEnabled} onClick={(e) => toggleAi(conv.username, e)} />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: c.muted, marginBottom: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last.content}</p>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 500, background: tone.bg, color: tone.color, padding: '0.12rem 0.45rem', borderRadius: '5px', textTransform: 'uppercase', ...tabular }}>{tone.label} {conv.score}</span>
                    {conv.isLead && <span style={{ fontSize: '0.6rem', fontWeight: 500, background: c.warnBg, color: c.warn, border: `1px solid ${c.warnBorder}`, padding: '0.12rem 0.4rem', borderRadius: '5px' }}>LEAD</span>}
                    {!conv.aiEnabled && <span style={{ fontSize: '0.6rem', fontWeight: 500, background: c.surfaceAlt, color: c.muted, padding: '0.12rem 0.4rem', borderRadius: '5px' }}>{pauseInfo(conv.pausedReason).badge}</span>}
                    <span style={{ fontSize: '0.66rem', color: c.faint, marginLeft: 'auto' }}>{timeAgo(conv.last.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Conversation Detail */}
        <div style={{ flex: 1, padding: '2.25rem 3rem', overflowY: 'auto', background: c.bg }}>
          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: c.faint }}>
              <p style={{ fontSize: '0.875rem' }}>Select a conversation</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: `1px solid ${c.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ ...label, marginBottom: '0.5rem' }}>{selected.count} message{selected.count === 1 ? '' : 's'} · {timeAgo(selected.last.created_at)}</p>
                    <h2 style={{ ...pageTitle, fontSize: '1.5rem' }}>@{nameFor(selected.username)}</h2>
                  </div>
                  {/* AI control */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: c.surface, border: `1px solid ${c.border}`, borderRadius: radius.lg, padding: '0.6rem 0.9rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 500, color: c.ink }}>Walter AI</p>
                      <p style={{ fontSize: '0.68rem', color: selected.aiEnabled ? c.good : c.faint }}>{selected.aiEnabled ? 'Replying automatically' : pauseInfo(selected.pausedReason).detail}</p>
                    </div>
                    <AiSwitch on={selected.aiEnabled} onClick={(e) => toggleAi(selected.username, e)} size="md" />
                  </div>
                </div>
              </div>

              {!selected.aiEnabled && (
                <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderLeft: `2px solid ${selected.pausedReason && selected.pausedReason !== 'owner' ? c.warn : '#22c55e'}`, borderRadius: '0 8px 8px 0', padding: '0.8rem 1rem', marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.82rem', color: c.body }}>
                    {selected.pausedReason === 'troll'
                      ? <>Walter stepped back from @{nameFor(selected.username)} — it looked like they were wasting time. It’ll pick back up automatically if they show genuine buying interest, or switch it on to reply now.</>
                      : selected.pausedReason === 'optout'
                      ? <>@{nameFor(selected.username)} asked to stop hearing from you, so Walter went quiet. It’ll only re-engage if they come back with clear buying intent — or switch it on to reply yourself.</>
                      : selected.pausedReason === 'abuse'
                      ? <>Walter stepped back from @{nameFor(selected.username)} after abusive messages. It stays quiet unless they return with genuine buying intent — or switch it on to handle it yourself.</>
                      : <>You&apos;re handling this chat. Walter won&apos;t auto-reply to @{nameFor(selected.username)} until you switch it back on.</>}
                  </p>
                </div>
              )}

              {/* Thread */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.75rem' }}>
                {selected.messages.map(m => (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ background: c.surfaceAlt, borderRadius: '14px 14px 14px 4px', padding: '0.8rem 1rem', maxWidth: '70%' }}>
                      <p style={{ color: c.body, fontSize: '0.875rem', lineHeight: 1.55 }}>{m.content}</p>
                    </div>
                    {m.ai_reply && (
                      <div style={{ background: c.ink, borderRadius: '14px 14px 4px 14px', padding: '0.8rem 1rem', maxWidth: '70%', alignSelf: 'flex-end' }}>
                        <p style={{ color: '#fff', fontSize: '0.875rem', lineHeight: 1.55 }}>{m.ai_reply}</p>
                        <p style={{ color: '#a1a1aa', fontSize: '0.62rem', marginTop: '0.35rem' }}>AI · sent automatically</p>
                      </div>
                    )}
                    {!m.ai_reply && m.status === 'manual' && (
                      <p style={{ alignSelf: 'flex-end', fontSize: '0.66rem', color: c.faint, fontStyle: 'italic' }}>awaiting your reply</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Draft a follow-up */}
              <div style={{ ...card, maxWidth: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <p style={{ ...label, color: c.ink, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>✦</span> Draft a follow-up
                  </p>
                  <button onClick={handleDraft} disabled={drafting}
                    style={{ padding: '0.45rem 1rem', borderRadius: radius.md, border: `1px solid ${c.ink}`, background: c.ink, color: '#fff', cursor: drafting ? 'default' : 'pointer', fontSize: '0.78rem', fontWeight: 500, opacity: drafting ? 0.5 : 1, fontFamily: font }}>
                    {drafting ? 'Drafting…' : draft ? 'Redraft' : 'Draft in my voice'}
                  </button>
                </div>
                {drafting ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[90, 70].map((w, i) => (<div key={i} style={{ height: '13px', width: `${w}%`, borderRadius: '6px', background: 'linear-gradient(90deg,#f0f0f1,#e7e7e9,#f0f0f1)', backgroundSize: '200% 100%', animation: 'waltershimmer 1.4s ease-in-out infinite' }} />))}
                  </div>
                ) : draft ? (
                  <div>
                    <div style={{ background: c.surfaceAlt, borderLeft: `2px solid ${c.ink}`, borderRadius: '0 8px 8px 0', padding: '0.9rem 1.1rem', marginBottom: '0.8rem' }}>
                      <p style={{ color: c.body, fontSize: '0.9rem', lineHeight: 1.65 }}>{draft}</p>
                    </div>
                    <button onClick={copyDraft} style={{ padding: '0.45rem 1rem', borderRadius: radius.md, border: `1px solid ${copied ? c.goodBorder : c.border}`, background: copied ? c.goodBg : c.surface, color: copied ? c.good : c.muted, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, fontFamily: font }}>
                      {copied ? 'Copied ✓' : 'Copy to clipboard'}
                    </button>
                  </div>
                ) : (
                  <p style={{ color: c.muted, fontSize: '0.85rem', lineHeight: 1.6 }}>
                    Walter will write a follow-up DM in your voice to re-open the conversation with @{nameFor(selected.username)}.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
