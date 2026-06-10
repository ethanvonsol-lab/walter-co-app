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
  created_at: string
}

interface BriefingLead {
  username: string
  score: number
  reason: string
}

// Rough estimate of pipeline value per hot lead. Configurable in Settings later.
const AVG_DEAL_VALUE = 1500

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #ebebeb',
  borderRadius: '16px',
  padding: '1.75rem 2rem',
  boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
}

const eyebrow: React.CSSProperties = {
  color: '#bbb',
  fontSize: '0.62rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
}

export default function Dashboard() {
  const [clientName, setClientName] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState({ total: 0, leads: 0, escalated: 0, today: 0, todayLeads: 0 })
  const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [testMessage, setTestMessage] = useState('')
  const [testReply, setTestReply] = useState('')
  const [loading, setLoading] = useState(false)

  const [briefing, setBriefing] = useState('')
  const [briefingLeads, setBriefingLeads] = useState<BriefingLead[]>([])
  const [briefingLoading, setBriefingLoading] = useState(true)
  const [briefingTime, setBriefingTime] = useState('')
  const [flashId, setFlashId] = useState<string | null>(null)

  useEffect(() => {
    const isToday = (iso: string) => {
      const d = new Date(iso)
      const n = new Date()
      return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
    }

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: client } = await supabase.from('clients').select('*').eq('email', user.email).single()
      if (!client) return
      setClientName(client.name || '')

      const { data: msgs } = await supabase
        .from('messages').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
      if (msgs) {
        setMessages(msgs.slice(0, 5))
        setStats({
          total: msgs.length,
          leads: msgs.filter(m => m.is_lead).length,
          escalated: msgs.filter(m => m.status === 'escalated').length,
          today: msgs.filter(m => isToday(m.created_at)).length,
          todayLeads: msgs.filter(m => m.is_lead && isToday(m.created_at)).length,
        })
        const days = Array(7).fill(0)
        const now = new Date()
        msgs.forEach(m => {
          const daysAgo = Math.floor((now.getTime() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24))
          if (daysAgo < 7) days[6 - daysAgo]++
        })
        setChartData(days)
      }

      // Walter Intelligence — AI-written briefing + intent-ranked leads.
      fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })
        .then(r => r.json())
        .then(data => {
          setBriefing(data.briefing || '')
          setBriefingLeads(data.leads || [])
          setBriefingTime(new Date().toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' }))
        })
        .catch(() => setBriefing("Walter couldn't generate your briefing right now."))
        .finally(() => setBriefingLoading(false))

      // Real-time subscription — the live pulse.
      const channel = supabase
        .channel('dashboard-channel')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `client_id=eq.${client.id}`
        }, (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => [newMsg, ...prev.slice(0, 4)])
          setStats(prev => ({
            ...prev,
            total: prev.total + 1,
            leads: newMsg.is_lead ? prev.leads + 1 : prev.leads,
            today: prev.today + 1,
            todayLeads: newMsg.is_lead ? prev.todayLeads + 1 : prev.todayLeads,
          }))
          setFlashId(newMsg.id)
          setTimeout(() => setFlashId(null), 4000)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
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

  // Sparkline points for the "replies today" trend.
  const sparkPoints = chartData
    .map((v, i) => {
      const x = (i / (chartData.length - 1)) * 60
      const y = 24 - (v / maxChart) * 22
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const pipelineValue = Math.round(
    briefingLeads.reduce((sum, l) => sum + (l.score / 100) * AVG_DEAL_VALUE, 0)
  )

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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Cormorant Garamond", Georgia, serif', background: '#fafaf8' }}>
      <Sidebar active="Dashboard" />

      <main style={{ marginLeft: '260px', flex: 1, padding: '3.5rem 4rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid #f0f0f0' }}>
          <div>
            <p style={{ ...eyebrow, fontSize: '0.65rem', letterSpacing: '0.25em', marginBottom: '0.5rem' }}>
              {new Date().toLocaleDateString('en-NZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 300, color: '#111', letterSpacing: '0.01em' }}>
              {getGreeting()}{clientName ? `, ${clientName}` : ''}.
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', background: '#fff', border: '1px solid #ebebeb', borderRadius: '999px', padding: '0.5rem 0.9rem' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1d9e75', animation: 'walterpulse 1.6s ease-in-out infinite' }} />
            <span style={{ fontSize: '0.78rem', letterSpacing: '0.03em', color: '#444' }}>Walter is live</span>
          </div>
        </div>

        {/* Walter Intelligence */}
        <div style={{ ...card, padding: '2rem 2.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ ...eyebrow, color: '#111', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem' }}>✦</span> Walter Intelligence
            </p>
            <span style={{ fontSize: '0.68rem', color: '#bbb', letterSpacing: '0.04em' }}>
              {briefingLoading ? 'thinking…' : briefingTime ? `briefing generated ${briefingTime}` : ''}
            </span>
          </div>

          {briefingLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[92, 80, 64].map((w, i) => (
                <div key={i} style={{ height: '14px', width: `${w}%`, borderRadius: '6px', background: 'linear-gradient(90deg,#f3f3f1,#ececea,#f3f3f1)', backgroundSize: '200% 100%', animation: 'waltershimmer 1.4s ease-in-out infinite' }} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '1.15rem', lineHeight: 1.55, fontWeight: 300, color: '#222' }}>{briefing}</p>
          )}

          {!briefingLoading && (
            <div style={{ borderTop: '1px solid #f2f2f0', paddingTop: '1.25rem', marginTop: '1.5rem' }}>
              <p style={{ ...eyebrow, fontSize: '0.58rem', marginBottom: '1rem' }}>Act now · ranked by buying intent</p>
              {briefingLeads.length === 0 ? (
                <p style={{ color: '#bbb', fontSize: '0.85rem' }}>No hot leads right now — Walter&apos;s watching every DM.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {briefingLeads.map((lead, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                      <span style={{ fontSize: '0.9rem', color: '#111', width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{lead.username}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ height: '4px', background: '#f0f0ee', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.25rem' }}>
                          <div style={{ width: `${lead.score}%`, height: '100%', background: '#111', transition: 'width 0.6s ease' }} />
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#aaa' }}>{lead.reason}</p>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#888', width: '32px', textAlign: 'right' }}>{lead.score}</span>
                      <a href="/dashboard/inbox" style={{ fontSize: '0.62rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: i === 0 ? '#111' : '#999', border: `1px solid ${i === 0 ? '#111' : '#e2e2e0'}`, borderRadius: '6px', padding: '0.4rem 0.85rem', textDecoration: 'none', fontFamily: 'inherit' }}>Reply</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={card}>
            <p style={{ ...eyebrow, marginBottom: '1rem' }}>Replies Today</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '2.75rem', fontWeight: 300, color: '#111', lineHeight: 1 }}>{stats.today}</p>
              <svg width="72" height="30" viewBox="0 0 60 26" style={{ overflow: 'visible' }}>
                <polyline points={sparkPoints} fill="none" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ color: '#ccc', fontSize: '0.72rem', marginTop: '0.5rem' }}>{stats.total} all time</p>
          </div>
          <div style={card}>
            <p style={{ ...eyebrow, marginBottom: '1rem' }}>Leads Captured</p>
            <p style={{ fontSize: '2.75rem', fontWeight: 300, color: '#111', lineHeight: 1, marginBottom: '0.4rem' }}>{stats.todayLeads}</p>
            <p style={{ color: '#ccc', fontSize: '0.72rem' }}>{stats.leads} all time · {stats.escalated} escalated</p>
          </div>
          <div style={{ background: '#111', borderRadius: '16px', padding: '1.75rem 2rem' }}>
            <p style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#777', marginBottom: '1rem' }}>Pipeline Value</p>
            <p style={{ fontSize: '2.75rem', fontWeight: 300, color: '#fff', lineHeight: 1, marginBottom: '0.4rem' }}>
              ${pipelineValue.toLocaleString()}
            </p>
            <p style={{ color: '#9a9a9a', fontSize: '0.72rem' }}>
              {briefingLoading ? 'estimating…' : `est. from ${briefingLeads.length} hot lead${briefingLeads.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {/* Chart + Funnel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={card}>
            <p style={{ ...eyebrow, marginBottom: '0.4rem' }}>Reply Activity</p>
            <p style={{ color: '#ccc', fontSize: '0.75rem', marginBottom: '1.75rem' }}>Messages replied to — last 7 days</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem', height: '130px' }}>
              {chartData.map((val, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', height: '100%', justifyContent: 'flex-end' }}>
                  <p style={{ color: '#ddd', fontSize: '0.6rem' }}>{val || ''}</p>
                  <div style={{ width: '100%', background: val > 0 ? '#111' : '#f0f0f0', borderRadius: '3px 3px 0 0', height: `${Math.max((val / maxChart) * 100, val > 0 ? 8 : 3)}%`, transition: 'height 0.3s ease' }} />
                  <p style={{ color: '#ccc', fontSize: '0.6rem' }}>{getDayLabel(i)}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <p style={{ ...eyebrow, marginBottom: '0.4rem' }}>Funnel</p>
            <p style={{ color: '#ccc', fontSize: '0.75rem', marginBottom: '1.75rem' }}>Message to lead conversion</p>
            {[
              { label: 'Messages', value: stats.total, pct: 100 },
              { label: 'Leads', value: stats.leads, pct: stats.total > 0 ? Math.round((stats.leads / stats.total) * 100) : 0 },
              { label: 'Escalated', value: stats.escalated, pct: stats.total > 0 ? Math.round((stats.escalated / stats.total) * 100) : 0 },
            ].map((row, i) => (
              <div key={i} style={{ marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <p style={{ color: '#888', fontSize: '0.75rem' }}>{row.label}</p>
                  <p style={{ color: '#111', fontSize: '0.75rem' }}>{row.value}</p>
                </div>
                <div style={{ background: '#f5f5f3', borderRadius: '4px', height: '3px' }}>
                  <div style={{ background: '#111', borderRadius: '4px', height: '3px', width: `${row.pct}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity + AI Test */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <p style={eyebrow}>Live Activity</p>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.62rem', color: '#bbb', letterSpacing: '0.05em' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1d9e75', animation: 'walterpulse 1.6s ease-in-out infinite' }} /> real-time
              </span>
            </div>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#ddd' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💬</p>
                <p style={{ fontSize: '0.8rem' }}>No messages yet</p>
              </div>
            ) : messages.map(msg => (
              <div key={msg.id} style={{ paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid #f5f5f5', background: flashId === msg.id ? '#f6faf8' : 'transparent', borderLeft: flashId === msg.id ? '2px solid #1d9e75' : '2px solid transparent', paddingLeft: '0.6rem', marginLeft: '-0.6rem', borderRadius: '0 4px 4px 0', transition: 'background 0.6s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.82rem', color: '#111' }}>@{msg.from_username}</p>
                  {msg.is_lead && <span style={{ fontSize: '0.58rem', background: '#111', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', letterSpacing: '0.08em' }}>LEAD</span>}
                </div>
                <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.2rem' }}>{msg.content}</p>
                <p style={{ fontSize: '0.75rem', color: '#bbb', fontStyle: 'italic' }}>↳ {msg.ai_reply}</p>
              </div>
            ))}
          </div>

          <div style={card}>
            <p style={{ ...eyebrow, marginBottom: '0.4rem' }}>Test Your AI</p>
            <p style={{ color: '#ccc', fontSize: '0.75rem', marginBottom: '1.5rem' }}>Simulate an incoming message</p>
            <input
              type="text"
              value={testMessage}
              onChange={e => setTestMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTest()}
              placeholder="e.g. How much do your sessions cost?"
              style={{ width: '100%', padding: '0.825rem 1rem', borderRadius: '8px', border: '1px solid #ebebeb', fontSize: '0.82rem', color: '#111', background: '#fafaf8', boxSizing: 'border-box', marginBottom: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
            />
            <button
              onClick={handleTest}
              disabled={loading || !testMessage}
              style={{ width: '100%', padding: '0.825rem', borderRadius: '8px', border: '1px solid #111', background: '#111', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: loading || !testMessage ? 0.4 : 1, fontFamily: 'inherit' }}
            >
              {loading ? 'Generating...' : 'Generate Reply →'}
            </button>
            {testReply && (
              <div style={{ marginTop: '1.25rem', padding: '1.25rem', background: '#fafaf8', borderRadius: '8px', borderLeft: '2px solid #111' }}>
                <p style={{ ...eyebrow, fontSize: '0.6rem', letterSpacing: '0.15em', marginBottom: '0.6rem' }}>AI Response</p>
                <p style={{ color: '#444', fontSize: '0.85rem', lineHeight: 1.7, fontStyle: 'italic' }}>{testReply}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
