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

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selected, setSelected] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [clientId, setClientId] = useState('')
  const [newCount, setNewCount] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: client } = await supabase.from('clients').select('id').eq('email', user.email).single()
      if (!client) return
      setClientId(client.id)

      const { data } = await supabase
        .from('messages').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
      if (data) {
        setMessages(data)
        if (data.length > 0) setSelected(data[0])
      }
      setLoading(false)

      // Real-time subscription
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#fafaf8' }}>
      <Sidebar active="Inbox" />

      <main style={{ marginLeft: '260px', flex: 1, display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Message List */}
        <div style={{ width: '340px', background: '#fff', borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Inbox</p>
              {newCount > 0 && (
                <span style={{ background: '#111', color: '#fff', fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '10px', letterSpacing: '0.05em' }}>
                  {newCount} new
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
            ) : filtered.map(msg => (
              <div
                key={msg.id}
                onClick={() => setSelected(msg)}
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
                <p style={{ fontSize: '0.76rem', color: '#999', marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.content}</p>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {msg.is_lead && <span style={{ fontSize: '0.55rem', background: '#111', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '3px', letterSpacing: '0.08em' }}>LEAD</span>}
                  {msg.status === 'escalated' && <span style={{ fontSize: '0.55rem', background: '#cc4444', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '3px', letterSpacing: '0.08em' }}>ESCALATED</span>}
                </div>
              </div>
            ))}
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
              <div style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid #ebebeb' }}>
                <p style={{ color: '#bbb', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{timeAgo(selected.created_at)} · {selected.type}</p>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#111', marginBottom: '0.75rem' }}>@{selected.from_username}</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selected.is_lead && <span style={{ fontSize: '0.6rem', background: '#111', color: '#fff', padding: '0.25rem 0.6rem', borderRadius: '4px', letterSpacing: '0.08em' }}>LEAD</span>}
                  <span style={{ fontSize: '0.6rem', background: '#f5f5f3', color: '#888', padding: '0.25rem 0.6rem', borderRadius: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{selected.status}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
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
            </>
          )}
        </div>
      </main>
    </div>
  )
}