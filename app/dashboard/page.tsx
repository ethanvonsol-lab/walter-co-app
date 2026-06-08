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
  created_at: string
}

export default function Dashboard() {
  const [clientName, setClientName] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState({ total: 0, leads: 0, escalated: 0 })
  const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [testMessage, setTestMessage] = useState('')
  const [testReply, setTestReply] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: client } = await supabase.from('clients').select('*').eq('email', user.email).single()
      if (!client) return

      setClientName(client.name || '')

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })

      if (msgs) {
        setMessages(msgs.slice(0, 5))
        setStats({
          total: msgs.length,
          leads: msgs.filter(m => m.is_lead).length,
          escalated: msgs.filter(m => m.status === 'escalated').length,
        })

        // Build 7-day chart data
        const days = Array(7).fill(0)
        const now = new Date()
        msgs.forEach(m => {
          const msgDate = new Date(m.created_at)
          const daysAgo = Math.floor((now.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24))
          if (daysAgo < 7) days[6 - daysAgo]++
        })
        setChartData(days)
      }
    }
    fetchData()
  }, [])

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getDayLabel = (i: number) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en', { weekday: 'short' })
  }

  const maxChart = Math.max(...chartData, 1)

  const handleTest = async () => {
    setLoading(true)
    const res = await fetch('/api/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: testMessage,
        voiceProfile: 'You are a friendly, professional business owner. You are warm, concise, and always end with a question.'
      })
    })
    const data = await res.json()
    setTestReply(data.reply)
    setLoading(false)
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
          { label: 'Dashboard', href: '/dashboard', active: true },
          { label: 'Inbox', href: '/dashboard/inbox', active: false },
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
      <main style={{ marginLeft: '280px', flex: 1, padding: '4rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '3.5rem' }}>
          <p style={{ color: '#aaa', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            {new Date().toLocaleDateString('en-NZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '300', color: '#111', letterSpacing: '0.01em', marginBottom: '0.5rem' }}>
            {getGreeting()}{clientName ? `, ${clientName}` : ''}.
          </h2>
          <p style={{ color: '#999', fontSize: '0.85rem' }}>Your Instagram automation is active and running.</p>
          <div style={{ width: '40px', height: '1px', background: '#111', marginTop: '1.5rem' }} />
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Replies', value: stats.total, sub: 'All time' },
            { label: 'Leads Captured', value: stats.leads, sub: 'All time' },
            { label: 'Escalated', value: stats.escalated, sub: 'Needs review' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
              <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>{stat.label}</p>
              <p style={{ fontSize: '3rem', fontWeight: '300', color: '#111', lineHeight: 1, marginBottom: '0.5rem' }}>{stat.value}</p>
              <p style={{ color: '#ccc', fontSize: '0.7rem' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Chart + Recent Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>

          {/* Bar Chart */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Reply Activity</p>
            <p style={{ color: '#999', fontSize: '0.75rem', marginBottom: '2rem' }}>Messages replied to — last 7 days</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', height: '140px' }}>
              {chartData.map((val, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', height: '100%', justifyContent: 'flex-end' }}>
                  <p style={{ color: '#ccc', fontSize: '0.65rem' }}>{val || ''}</p>
                  <div style={{
                    width: '100%',
                    background: val > 0 ? '#111' : '#f0f0f0',
                    borderRadius: '4px 4px 0 0',
                    height: `${Math.max((val / maxChart) * 100, val > 0 ? 8 : 4)}%`,
                    transition: 'height 0.3s ease'
                  }} />
                  <p style={{ color: '#ccc', fontSize: '0.6rem', letterSpacing: '0.05em' }}>{getDayLabel(i)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Funnel */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Funnel</p>
            <p style={{ color: '#999', fontSize: '0.75rem', marginBottom: '2rem' }}>Message to lead conversion</p>
            {[
              { label: 'Messages Received', value: stats.total, pct: 100 },
              { label: 'Leads Identified', value: stats.leads, pct: stats.total > 0 ? Math.round((stats.leads / stats.total) * 100) : 0 },
              { label: 'Escalated', value: stats.escalated, pct: stats.total > 0 ? Math.round((stats.escalated / stats.total) * 100) : 0 },
            ].map((row, i) => (
              <div key={i} style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <p style={{ color: '#888', fontSize: '0.75rem' }}>{row.label}</p>
                  <p style={{ color: '#111', fontSize: '0.75rem', fontWeight: '500' }}>{row.value}</p>
                </div>
                <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '4px' }}>
                  <div style={{ background: '#111', borderRadius: '4px', height: '4px', width: `${row.pct}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Messages + AI Test */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* Recent Messages */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Recent Messages</p>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#ccc' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💬</p>
                <p style={{ fontSize: '0.8rem' }}>No messages yet</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} style={{ paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#111', fontWeight: '500' }}>@{msg.from_username}</p>
                    {msg.is_lead && <span style={{ fontSize: '0.6rem', background: '#111', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', letterSpacing: '0.1em' }}>LEAD</span>}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.25rem' }}>{msg.content}</p>
                  <p style={{ fontSize: '0.75rem', color: '#bbb', fontStyle: 'italic' }}>↳ {msg.ai_reply}</p>
                </div>
              ))
            )}
          </div>

          {/* AI Test */}
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Test Your AI</p>
            <p style={{ color: '#999', fontSize: '0.75rem', marginBottom: '1.5rem' }}>Simulate an incoming message</p>
            <input
              type="text"
              value={testMessage}
              onChange={e => setTestMessage(e.target.value)}
              placeholder="e.g. How much do your sessions cost?"
              style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '8px', border: '1px solid #ebebeb', fontSize: '0.8rem', color: '#111', background: '#fafafa', boxSizing: 'border-box', marginBottom: '1rem', outline: 'none', fontFamily: 'inherit' }}
            />
            <button
              onClick={handleTest}
              disabled={loading || !testMessage}
              style={{ width: '100%', padding: '0.875rem', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: loading || !testMessage ? 0.4 : 1 }}
            >
              {loading ? 'Generating...' : 'Generate Reply'}
            </button>
            {testReply && (
              <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#fafafa', borderRadius: '8px', borderLeft: '2px solid #111' }}>
                <p style={{ color: '#bbb', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>AI Response</p>
                <p style={{ color: '#333', fontSize: '0.85rem', lineHeight: '1.7', fontStyle: 'italic' }}>{testReply}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}