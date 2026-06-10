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

// Lightweight buying-intent score (0-100) from message text — same signals the
// webhook flags on. Instant, no AI call; used for the intent badge.
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

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selected, setSelected] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [clientId, setClientId] = useState('')
  const [newCount, setNewCount] = useState(0)

  // Follow-up drafting (per selected message).
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
        if (data.length > 0) setSelected(data[0])
      }
      setLoading(false)

      const channel = supabase
        .channel('messages-channel')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `client_id=eq.${client.id}`
        }, (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => [newMsg, ...prev])
          setNewCount(prev => prev + 1)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [])

  // Reset the draft whenever a different message is selected.
  const selectMessage = (msg: Message) => {
    setSelected(msg)
    setDraft('')
    setCopied(false)
  }

  const handleDraft = async () => {
    if (!selected) return
    setDrafting(true)
    setDraft('')
    setCopied(false)
    try {
      const res = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          username: selected.from_username,
          lastMessage: selected.content,
          lastReply: selected.ai_reply,
        }),
      })
      const data = await res.json()
      setDraft(data.followup || data.error || 'No draft returned.')
    } catch {
      setDraft("Walter couldn't draft a follow-up right now.")
    }
    setDrafting(false)
  }

  const copyDraft = () => {
    navigator.clipboard?.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const filtered = messages.filter(m => {
    if (filter === 'leads') return m.is_lead
    if (filter === 'escalated') return m.status === 'escalated'
    return true
  })

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const selScore = selected ? scoreMessage(selected.content) : 0
  const selTone = intentTone(selScore)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#fafaf8' }}>
      <Sidebar active="Inbox" />

      <main style={{ marginLeft: '260px', flex: 1, display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Message List */}
        <div style={{ width: '360px', background: '#fff', borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Inbox</p>
              {newCount > 0 ? (
                <span style={{ background: '#111', color: '#fff', fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '10px', letterSpacing: '0.05em' }}>
                  {newCount} new
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.6rem', color: '#bbb', letterSpacing: '0.05em' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1d9e75', animation: 'walterpulse 1.6s ease-in-out infinite' }} /> live
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#111', marginBottom: '1rem' }}>Messages</h1>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {['all', 'leads', 'escalated'].map(f => (
                <button key={f} onClick={() => { setFilter(f); setNewCount(0) }} style={{
                  padding: '0.3rem 0.875rem', borderRadius: '20px', border: '1px solid',
                  borderColor: filter === f ? '#111' : '#e8e8e8',
                  background: filter === f ? '#111' : 'transparent',
                  color: filter === f ? '#fff' : '#aaa',
                  fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase',
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
                <p style={{ fontSize: '0.8rem' }}>No messages yet</p>
              </div>
            ) : filtered.map(msg => {
              const score = scoreMessage(msg.content)
              const tone = intentTone(score)
              return (
                <div
                  key={msg.id}
                  onClick={() => selectMessage(msg)}
                  style={{
                    padding: '1.1rem 1.5rem', borderBottom: '1px solid #f5f5f5',
                    cursor: 'pointer',
                    background: selected?.id === msg.id ? '#fafaf8' : '#fff',
                    borderLeft: selected?.id === msg.id ? '2px solid #111' : '2px solid transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <p style={{ fontSize: '0.85rem', color: '#111' }}>@{msg.from_username}</p>
                    <p style={{ fontSize: '0.65rem', color: '#ccc' }}>{timeAgo(msg.created_at)}</p>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: '#999', marginBottom: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.content}</p>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.55rem', background: tone.bg, color: tone.color, padding: '0.15rem 0.45rem', borderRadius: '3px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tone.label} {score}</span>
                    {msg.is_lead && <span style={{ fontSize: '0.55rem', background: '#fffaf0', color: '#8a6a2a', border: '1px solid #e6d8c8', padding: '0.15rem 0.4rem', borderRadius: '3px', letterSpacing: '0.08em' }}>LEAD</span>}
                    {msg.status === 'escalated' && <span style={{ fontSize: '0.55rem', background: '#cc4444', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '3px', letterSpacing: '0.08em' }}>ESCALATED</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Message Detail */}
        <div style={{ flex: 1, padding: '3rem 3.5rem', overflowY: 'auto', background: '#fafaf8' }}>
          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>
              <p style={{ fontSize: '0.85rem' }}>Select a message to view</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #ebebeb' }}>
                <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{timeAgo(selected.created_at)} · {selected.type}</p>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#111', marginBottom: '0.75rem' }}>@{selected.from_username}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.6rem', background: selTone.bg, color: selTone.color, padding: '0.25rem 0.6rem', borderRadius: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{selTone.label} intent · {selScore}</span>
                  {selected.is_lead && <span style={{ fontSize: '0.6rem', background: '#fffaf0', color: '#8a6a2a', border: '1px solid #e6d8c8', padding: '0.25rem 0.6rem', borderRadius: '4px', letterSpacing: '0.08em' }}>LEAD</span>}
                  <span style={{ fontSize: '0.6rem', background: '#f5f5f3', color: '#888', padding: '0.25rem 0.6rem', borderRadius: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{selected.status}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '2rem' }}>
                <div style={{ background: '#f0f0ee', borderRadius: '14px 14px 14px 4px', padding: '1rem 1.25rem', maxWidth: '75%' }}>
                  <p style={{ color: '#555', fontSize: '0.85rem', lineHeight: '1.6' }}>{selected.content}</p>
                </div>
                {selected.ai_reply && (
                  <div style={{ background: '#111', borderRadius: '14px 14px 4px 14px', padding: '1rem 1.25rem', maxWidth: '75%', alignSelf: 'flex-end' }}>
                    <p style={{ color: '#fff', fontSize: '0.85rem', lineHeight: '1.6' }}>{selected.ai_reply}</p>
                    <p style={{ color: '#555', fontSize: '0.62rem', marginTop: '0.4rem', letterSpacing: '0.05em' }}>AI · Sent automatically</p>
                  </div>
                )}
              </div>

              {/* Walter — draft a follow-up */}
              <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.75rem 2rem', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', maxWidth: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <p style={{ color: '#111', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>✦</span> Draft a follow-up
                  </p>
                  <button
                    onClick={handleDraft}
                    disabled={drafting}
                    style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', border: '1px solid #111', background: '#111', color: '#fff', cursor: drafting ? 'default' : 'pointer', fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: drafting ? 0.5 : 1, fontFamily: 'inherit' }}
                  >
                    {drafting ? 'Drafting…' : draft ? 'Redraft' : 'Draft in my voice'}
                  </button>
                </div>

                {drafting ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[90, 70].map((w, i) => (
                      <div key={i} style={{ height: '13px', width: `${w}%`, borderRadius: '6px', background: 'linear-gradient(90deg,#f3f3f1,#ececea,#f3f3f1)', backgroundSize: '200% 100%', animation: 'waltershimmer 1.4s ease-in-out infinite' }} />
                    ))}
                  </div>
                ) : draft ? (
                  <div>
                    <div style={{ background: '#fafaf8', borderLeft: '2px solid #111', borderRadius: '0 8px 8px 0', padding: '1rem 1.25rem', marginBottom: '0.875rem' }}>
                      <p style={{ color: '#333', fontSize: '0.9rem', lineHeight: '1.65', fontStyle: 'italic' }}>{draft}</p>
                    </div>
                    <button
                      onClick={copyDraft}
                      style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', border: '1px solid #e8e8e8', background: copied ? '#f0faf0' : '#fff', color: copied ? '#2a7a2a' : '#888', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.05em', fontFamily: 'inherit' }}
                    >
                      {copied ? 'Copied ✓' : 'Copy to clipboard'}
                    </button>
                  </div>
                ) : (
                  <p style={{ color: '#bbb', fontSize: '0.82rem', lineHeight: '1.6' }}>
                    {selected.from_username} went quiet? Walter will write a follow-up DM in your voice to re-open the conversation.
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
