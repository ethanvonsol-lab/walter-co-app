'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

  useEffect(() => {
    const fetchMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: client } = await supabase.from('clients').select('id').eq('email', user.email).single()
      if (!client) return
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
      if (data) {
        setMessages(data)
        if (data.length > 0) setSelected(data[0])
      }
      setLoading(false)
    }
    fetchMessages()
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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#f7f7f5' }}>

      {/* Sidebar */}
      <aside style={{ width: '280px', background: '#0f0f0f', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', position: 'fixed', height: '100vh' }}>
        <div style={{ marginBottom: '3rem' }}>
          <img src="/logo.png" alt="Walter & Co" style={{ width: '150px', filter: 'invert(1) brightness(2)', opacity: 0.95 }} />
        </div>
        <p style={{ color: '#333', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '1rem' }}>Navigation</p>
        {[
          { label: 'Dashboard', href: '/dashboard', active: false },
          { label: 'Inbox', href: '/dashboard/inbox', active: true },
          { label: 'Leads', href: '/dashboard/leads', active: false },
          { label: 'Analytics', href: '/dashboard/analytics', active: false },
          { label: 'Voice Profile', href: '/dashboard/voice', active: false },
          { label: 'Settings', href: '/dashboard/settings', active: false },
        ].map(item => (
          <a key={item.label} href={item.href} style={{
            color: item.active ? '#fff' : '#555',
            padding: '0.7rem 1rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.8rem',
            letterSpacing: '0.08em',
            background: item.active ? '#1a1a1a' : 'transparent',
            borderLeft: item.active ? '1px solid #444' : '1px solid transparent',
            display: 'block',
          }}>{item.label}</a>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ height: '1px', background: '#1a1a1a', marginBottom: '1.5rem' }} />
          <p style={{ color: '#2a2a2a', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>© 2026 Walter & Co</p>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: '280px', flex: 1, display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Message List */}
        <div style={{ width: '360px', background: '#fff', borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
            <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Inbox</p>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '300', color: '#111' }}>Messages</h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              {['all', 'leads', 'escalated'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: filter === f ? '#111' : '#e8e8e8',
                  background: filter === f ? '#111' : 'transparent',
                  color: filter === f ? '#fff' : '#999',
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
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
                  padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid #f5f5f5',
                  cursor: 'pointer',
                  background: selected?.id === msg.id ? '#fafafa' : '#fff',
                  borderLeft: selected?.id === msg.id ? '2px solid #111' : '2px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#111', fontWeight: '500' }}>@{msg.from_username}</p>
                  <p style={{ fontSize: '0.65rem', color: '#ccc' }}>{timeAgo(msg.created_at)}</p>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.content}</p>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {msg.is_lead && <span style={{ fontSize: '0.55rem', background: '#111', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '3px', letterSpacing: '0.1em' }}>LEAD</span>}
                  {msg.status === 'escalated' && <span style={{ fontSize: '0.55rem', background: '#ff4444', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '3px', letterSpacing: '0.1em' }}>ESCALATED</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Detail */}
        <div style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>
              <p style={{ fontSize: '0.85rem' }}>Select a message to view</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid #ebebeb' }}>
                <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{timeAgo(selected.created_at)} · {selected.type}</p>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#111' }}>@{selected.from_username}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {selected.is_lead && <span style={{ fontSize: '0.6rem', background: '#111', color: '#fff', padding: '0.25rem 0.6rem', borderRadius: '4px', letterSpacing: '0.1em' }}>LEAD</span>}
                  <span style={{ fontSize: '0.6rem', background: '#f0f0f0', color: '#888', padding: '0.25rem 0.6rem', borderRadius: '4px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{selected.status}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#f7f7f5', borderRadius: '12px 12px 12px 4px', padding: '1.25rem 1.5rem', maxWidth: '80%' }}>
                  <p style={{ color: '#555', fontSize: '0.85rem', lineHeight: '1.6' }}>{selected.content}</p>
                </div>
                <div style={{ background: '#111', borderRadius: '12px 12px 4px 12px', padding: '1.25rem 1.5rem', maxWidth: '80%', alignSelf: 'flex-end' }}>
                  <p style={{ color: '#fff', fontSize: '0.85rem', lineHeight: '1.6' }}>{selected.ai_reply}</p>
                  <p style={{ color: '#555', fontSize: '0.65rem', marginTop: '0.5rem', letterSpacing: '0.05em' }}>AI · Sent automatically</p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}