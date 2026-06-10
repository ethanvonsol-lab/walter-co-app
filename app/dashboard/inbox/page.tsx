'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

interface Message {
  id: string
  from_username: string
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
  score >= 70 ? { label: 'Hot', bg: '#111', color: '#fff' }
  : score >= 40 ? { label: 'Warm', bg: '#f0f0ee', color: '#555' }
  : { label: 'Low', bg: '#f7f7f5', color: '#bbb' }

// Small on/off switch (matches the Settings toggle).
function AiSwitch({ on, onClick, size = 'sm' }: { on: boolean; onClick: (e: React.MouseEvent) => void; size?: 'sm' | 'md' }) {
  const w = size === 'md' ? 44 : 34
  const knob = size === 'md' ? 16 : 12
  return (
    <button
      onClick={onClick}
      aria-label={on ? 'AI on' : 'AI off'}
      style={{ width: `${w}px`, height: `${knob + 8}px`, borderRadius: '999px', border: 'none', background: on ? '#1d9e75' : '#dcdcd8', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
    >
      <div style={{ width: `${knob}px`, height: `${knob}px`, borderRadius: '50%', background: '#fff', position: 'absolute', top: '4px', left: on ? `${w - knob - 4}px` : '4px', transition: 'left 0.2s' }} />
    </button>
  )
}

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [aiMap, setAiMap] = useState<Record<string, boolean>>({})
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
      }

      // Per-conversation AI switches (table may not exist yet — fail soft).
      const { data: settings } = await supabase
        .from('conversation_settings').select('from_username, ai_enabled').eq('client_id', client.id)
      if (settings) {
        const map: Record<string, boolean> = {}
        settings.forEach((s: { from_username: string; ai_enabled: boolean }) => { map[s.from_username] = s.ai_enabled })
        setAiMap(map)
      }
      setLoading(false)

      const channel = supabase
        .channel('messages-channel')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${client.id}`
        }, (payload) => setMessages(prev => [payload.new as Message, ...prev]))
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [])

  const toggleAi = async (username: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !(aiMap[username] ?? true)
    setAiMap(prev => ({ ...prev, [username]: next })) // optimistic
    try {
      await supabase.from('conversation_settings').upsert(
        { client_id: clientId, from_username: username, ai_enabled: next, updated_at: new Date().toISOString() },
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
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const pausedCount = conversations.filter(c => !c.aiEnabled).length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#fafaf8' }}>
      <Sidebar active="Inbox" />

      <main style={{ marginLeft: '260px', flex: 1, display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Conversation List */}
        <div style={{ width: '380px', background: '#fff', borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Inbox</p>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.6rem', color: '#bbb', letterSpacing: '0.05em' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1d9e75', animation: 'walterpulse 1.6s ease-in-out infinite' }} /> live
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#111', marginBottom: '0.3rem' }}>Conversations</h1>
            <p style={{ color: '#ccc', fontSize: '0.72rem', marginBottom: '1rem' }}>{conversations.length} people{pausedCount > 0 ? ` · ${pausedCount} you're handling` : ''}</p>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {['all', 'leads', 'paused'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '0.3rem 0.875rem', borderRadius: '20px', border: '1px solid',
                  borderColor: filter === f ? '#111' : '#e8e8e8', background: filter === f ? '#111' : 'transparent',
                  color: filter === f ? '#fff' : '#aaa', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>{f}</button>
              ))}
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#ccc', fontSize: '0.8rem' }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#ccc' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💬</p>
                <p style={{ fontSize: '0.8rem' }}>No conversations{filter !== 'all' ? ' in this view' : ' yet'}</p>
              </div>
            ) : filtered.map(c => {
              const tone = intentTone(c.score)
              return (
                <div
                  key={c.username}
                  onClick={() => selectConversation(c.username)}
                  style={{
                    padding: '1.1rem 1.5rem', borderBottom: '1px solid #f5f5f5', cursor: 'pointer',
                    background: selectedUser === c.username ? '#fafaf8' : '#fff',
                    borderLeft: selectedUser === c.username ? '2px solid #111' : '2px solid transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <p style={{ fontSize: '0.85rem', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{c.username}</p>
                    <AiSwitch on={c.aiEnabled} onClick={(e) => toggleAi(c.username, e)} />
                  </div>
                  <p style={{ fontSize: '0.76rem', color: '#999', marginBottom: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last.content}</p>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.55rem', background: tone.bg, color: tone.color, padding: '0.15rem 0.45rem', borderRadius: '3px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tone.label} {c.score}</span>
                    {c.isLead && <span style={{ fontSize: '0.55rem', background: '#fffaf0', color: '#8a6a2a', border: '1px solid #e6d8c8', padding: '0.15rem 0.4rem', borderRadius: '3px', letterSpacing: '0.08em' }}>LEAD</span>}
                    {!c.aiEnabled && <span style={{ fontSize: '0.55rem', background: '#f5f5f3', color: '#999', padding: '0.15rem 0.4rem', borderRadius: '3px', letterSpacing: '0.08em' }}>YOU</span>}
                    <span style={{ fontSize: '0.62rem', color: '#ccc', marginLeft: 'auto' }}>{timeAgo(c.last.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Conversation Detail */}
        <div style={{ flex: 1, padding: '2.5rem 3.5rem', overflowY: 'auto', background: '#fafaf8' }}>
          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>
              <p style={{ fontSize: '0.85rem' }}>Select a conversation</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #ebebeb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{selected.count} message{selected.count === 1 ? '' : 's'} · {timeAgo(selected.last.created_at)}</p>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#111' }}>@{selected.username}</h2>
                  </div>
                  {/* AI control */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fff', border: '1px solid #ebebeb', borderRadius: '12px', padding: '0.7rem 1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.72rem', color: '#111', letterSpacing: '0.03em' }}>Walter AI</p>
                      <p style={{ fontSize: '0.62rem', color: selected.aiEnabled ? '#1d9e75' : '#aaa' }}>{selected.aiEnabled ? 'Replying automatically' : 'Paused — you reply'}</p>
                    </div>
                    <AiSwitch on={selected.aiEnabled} onClick={(e) => toggleAi(selected.username, e)} size="md" />
                  </div>
                </div>
              </div>

              {!selected.aiEnabled && (
                <div style={{ background: '#fff', border: '1px solid #ebebeb', borderLeft: '2px solid #1d9e75', borderRadius: '0 10px 10px 0', padding: '0.85rem 1.1rem', marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.8rem', color: '#666' }}>You&apos;re handling this chat. Walter won&apos;t auto-reply to @{selected.username} until you switch it back on.</p>
                </div>
              )}

              {/* Thread */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                {selected.messages.map(m => (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ background: '#f0f0ee', borderRadius: '14px 14px 14px 4px', padding: '0.85rem 1.1rem', maxWidth: '70%' }}>
                      <p style={{ color: '#555', fontSize: '0.85rem', lineHeight: '1.55' }}>{m.content}</p>
                    </div>
                    {m.ai_reply && (
                      <div style={{ background: '#111', borderRadius: '14px 14px 4px 14px', padding: '0.85rem 1.1rem', maxWidth: '70%', alignSelf: 'flex-end' }}>
                        <p style={{ color: '#fff', fontSize: '0.85rem', lineHeight: '1.55' }}>{m.ai_reply}</p>
                        <p style={{ color: '#555', fontSize: '0.6rem', marginTop: '0.35rem', letterSpacing: '0.05em' }}>AI · sent automatically</p>
                      </div>
                    )}
                    {!m.ai_reply && m.status === 'manual' && (
                      <p style={{ alignSelf: 'flex-end', fontSize: '0.62rem', color: '#bbb', fontStyle: 'italic' }}>awaiting your reply</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Draft a follow-up */}
              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.75rem 2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', maxWidth: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <p style={{ color: '#111', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>✦</span> Draft a follow-up
                  </p>
                  <button onClick={handleDraft} disabled={drafting}
                    style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', border: '1px solid #111', background: '#111', color: '#fff', cursor: drafting ? 'default' : 'pointer', fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: drafting ? 0.5 : 1, fontFamily: 'inherit' }}>
                    {drafting ? 'Drafting…' : draft ? 'Redraft' : 'Draft in my voice'}
                  </button>
                </div>
                {drafting ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[90, 70].map((w, i) => (<div key={i} style={{ height: '13px', width: `${w}%`, borderRadius: '6px', background: 'linear-gradient(90deg,#f3f3f1,#ececea,#f3f3f1)', backgroundSize: '200% 100%', animation: 'waltershimmer 1.4s ease-in-out infinite' }} />))}
                  </div>
                ) : draft ? (
                  <div>
                    <div style={{ background: '#fafaf8', borderLeft: '2px solid #111', borderRadius: '0 8px 8px 0', padding: '1rem 1.25rem', marginBottom: '0.875rem' }}>
                      <p style={{ color: '#333', fontSize: '0.9rem', lineHeight: '1.65', fontStyle: 'italic' }}>{draft}</p>
                    </div>
                    <button onClick={copyDraft} style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', border: '1px solid #e8e8e8', background: copied ? '#f0faf0' : '#fff', color: copied ? '#2a7a2a' : '#888', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.05em', fontFamily: 'inherit' }}>
                      {copied ? 'Copied ✓' : 'Copy to clipboard'}
                    </button>
                  </div>
                ) : (
                  <p style={{ color: '#bbb', fontSize: '0.82rem', lineHeight: '1.6' }}>
                    Walter will write a follow-up DM in your voice to re-open the conversation with @{selected.username}.
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
