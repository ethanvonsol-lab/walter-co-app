'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { c, font, radius, card, label, statNumber, btn, input as inputStyle } from '@/lib/theme'

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

// Fallback when a client hasn't set their own average deal value yet.
const DEFAULT_DEAL_VALUE = 1500

export default function Dashboard() {
  const [clientName, setClientName] = useState('')
  const [avgDealValue, setAvgDealValue] = useState(DEFAULT_DEAL_VALUE)
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
      if (client.avg_deal_value) setAvgDealValue(client.avg_deal_value)

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
    briefingLeads.reduce((sum, l) => sum + (l.score / 100) * avgDealValue, 0)
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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: font, background: c.bg }}>
      <Sidebar active="Dashboard" />

      <main style={{ marginLeft: '244px', flex: 1, padding: '2.25rem 2.5rem', maxWidth: 1180 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
          <div>
            <p style={{ ...label, marginBottom: '0.4rem' }}>
              {new Date().toLocaleDateString('en-NZ', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 600, color: c.ink, letterSpacing: '-0.02em' }}>
              {getGreeting()}{clientName ? `, ${clientName}` : ''}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: c.surface, border: `1px solid ${c.border}`, borderRadius: radius.pill, padding: '0.4rem 0.8rem' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', animation: 'walterpulse 1.6s ease-in-out infinite' }} />
            <span style={{ fontSize: '0.8rem', color: c.body, fontWeight: 500 }}>Walter is live</span>
          </div>
        </div>

        {/* Walter Intelligence */}
        <div style={{ ...card, padding: '1.5rem 1.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{ ...label, color: c.ink, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem' }}>✦</span> Walter Intelligence
            </p>
            <span style={{ fontSize: '0.75rem', color: c.faint }}>
              {briefingLoading ? 'thinking…' : briefingTime ? `generated ${briefingTime}` : ''}
            </span>
          </div>

          {briefingLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {[92, 80, 64].map((w, i) => (
                <div key={i} style={{ height: '13px', width: `${w}%`, borderRadius: '6px', background: 'linear-gradient(90deg,#f0f0f1,#e7e7e9,#f0f0f1)', backgroundSize: '200% 100%', animation: 'waltershimmer 1.4s ease-in-out infinite' }} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '1.0rem', lineHeight: 1.6, color: c.body }}>{briefing}</p>
          )}

          {!briefingLoading && (
            <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: '1.1rem', marginTop: '1.25rem' }}>
              <p style={{ ...label, marginBottom: '0.85rem' }}>Act now · ranked by buying intent</p>
              {briefingLeads.length === 0 ? (
                <p style={{ color: c.faint, fontSize: '0.875rem' }}>No hot leads right now — Walter&apos;s watching every DM.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {briefingLeads.map((lead, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: c.ink, width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{lead.username}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ height: '5px', background: c.surfaceAlt, borderRadius: '4px', overflow: 'hidden', marginBottom: '0.3rem' }}>
                          <div style={{ width: `${lead.score}%`, height: '100%', background: c.ink, transition: 'width 0.6s ease' }} />
                        </div>
                        <p style={{ fontSize: '0.74rem', color: c.faint }}>{lead.reason}</p>
                      </div>
                      <span style={{ fontSize: '0.82rem', color: c.muted, width: '28px', textAlign: 'right' }}>{lead.score}</span>
                      <a href="/dashboard/inbox" style={{ fontSize: '0.78rem', fontWeight: 500, color: i === 0 ? '#fff' : c.body, background: i === 0 ? c.ink : c.surface, border: `1px solid ${i === 0 ? c.ink : c.border}`, borderRadius: radius.sm, padding: '0.35rem 0.8rem', textDecoration: 'none' }}>Reply</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={card}>
            <p style={{ ...label, marginBottom: '0.85rem' }}>Replies Today</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <p style={statNumber}>{stats.today}</p>
              <svg width="72" height="30" viewBox="0 0 60 26" style={{ overflow: 'visible' }}>
                <polyline points={sparkPoints} fill="none" stroke={c.ink} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ color: c.faint, fontSize: '0.78rem', marginTop: '0.5rem' }}>{stats.total} all time</p>
          </div>
          <div style={card}>
            <p style={{ ...label, marginBottom: '0.85rem' }}>Leads Captured</p>
            <p style={{ ...statNumber, marginBottom: '0.4rem' }}>{stats.todayLeads}</p>
            <p style={{ color: c.faint, fontSize: '0.78rem' }}>{stats.leads} all time · {stats.escalated} escalated</p>
          </div>
          <div style={{ background: c.ink, borderRadius: radius.lg, padding: '1.5rem' }}>
            <p style={{ ...label, color: '#a1a1aa', marginBottom: '0.85rem' }}>Pipeline Value</p>
            <p style={{ ...statNumber, color: '#fff', marginBottom: '0.4rem' }}>${pipelineValue.toLocaleString()}</p>
            <p style={{ color: '#a1a1aa', fontSize: '0.78rem' }}>
              {briefingLoading ? 'estimating…' : `est. from ${briefingLeads.length} hot lead${briefingLeads.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {/* Chart + Funnel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={card}>
            <p style={{ ...label, marginBottom: '0.3rem' }}>Reply Activity</p>
            <p style={{ color: c.faint, fontSize: '0.8rem', marginBottom: '1.5rem' }}>Messages replied to — last 7 days</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem', height: '130px' }}>
              {chartData.map((val, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', height: '100%', justifyContent: 'flex-end' }}>
                  <p style={{ color: c.faint, fontSize: '0.65rem' }}>{val || ''}</p>
                  <div style={{ width: '100%', background: val > 0 ? c.ink : c.surfaceAlt, borderRadius: '4px 4px 0 0', height: `${Math.max((val / maxChart) * 100, val > 0 ? 8 : 3)}%`, transition: 'height 0.3s ease' }} />
                  <p style={{ color: c.faint, fontSize: '0.65rem' }}>{getDayLabel(i)}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <p style={{ ...label, marginBottom: '0.3rem' }}>Funnel</p>
            <p style={{ color: c.faint, fontSize: '0.8rem', marginBottom: '1.5rem' }}>Message to lead conversion</p>
            {[
              { label: 'Messages', value: stats.total, pct: 100 },
              { label: 'Leads', value: stats.leads, pct: stats.total > 0 ? Math.round((stats.leads / stats.total) * 100) : 0 },
              { label: 'Escalated', value: stats.escalated, pct: stats.total > 0 ? Math.round((stats.escalated / stats.total) * 100) : 0 },
            ].map((row, i) => (
              <div key={i} style={{ marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <p style={{ color: c.muted, fontSize: '0.8rem' }}>{row.label}</p>
                  <p style={{ color: c.ink, fontSize: '0.8rem', fontWeight: 500 }}>{row.value}</p>
                </div>
                <div style={{ background: c.surfaceAlt, borderRadius: '4px', height: '5px' }}>
                  <div style={{ background: c.ink, borderRadius: '4px', height: '5px', width: `${row.pct}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity + AI Test */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <p style={label}>Live Activity</p>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: c.faint }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'walterpulse 1.6s ease-in-out infinite' }} /> real-time
              </span>
            </div>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: c.faint }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💬</p>
                <p style={{ fontSize: '0.85rem' }}>No messages yet</p>
              </div>
            ) : messages.map(msg => (
              <div key={msg.id} style={{ paddingBottom: '0.9rem', marginBottom: '0.9rem', borderBottom: `1px solid ${c.border}`, background: flashId === msg.id ? '#f0fdf4' : 'transparent', borderLeft: flashId === msg.id ? '2px solid #22c55e' : '2px solid transparent', paddingLeft: '0.6rem', marginLeft: '-0.6rem', borderRadius: '0 4px 4px 0', transition: 'background 0.6s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, color: c.ink }}>@{msg.from_username}</p>
                  {msg.is_lead && <span style={{ fontSize: '0.62rem', fontWeight: 500, background: c.ink, color: '#fff', padding: '0.15rem 0.45rem', borderRadius: '5px' }}>LEAD</span>}
                </div>
                <p style={{ fontSize: '0.82rem', color: c.muted, marginBottom: '0.2rem' }}>{msg.content}</p>
                <p style={{ fontSize: '0.8rem', color: c.faint }}>↳ {msg.ai_reply}</p>
              </div>
            ))}
          </div>

          <div style={card}>
            <p style={{ ...label, marginBottom: '0.3rem' }}>Test Your AI</p>
            <p style={{ color: c.faint, fontSize: '0.8rem', marginBottom: '1.25rem' }}>Simulate an incoming message</p>
            <input
              type="text"
              value={testMessage}
              onChange={e => setTestMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTest()}
              placeholder="e.g. How much do your sessions cost?"
              style={{ ...inputStyle, marginBottom: '0.75rem' }}
            />
            <button
              onClick={handleTest}
              disabled={loading || !testMessage}
              style={{ ...btn, width: '100%', padding: '0.65rem', opacity: loading || !testMessage ? 0.4 : 1 }}
            >
              {loading ? 'Generating…' : 'Generate Reply →'}
            </button>
            {testReply && (
              <div style={{ marginTop: '1.1rem', padding: '1.1rem', background: c.surfaceAlt, borderRadius: radius.md, borderLeft: `2px solid ${c.ink}` }}>
                <p style={{ ...label, marginBottom: '0.5rem' }}>AI Response</p>
                <p style={{ color: c.body, fontSize: '0.875rem', lineHeight: 1.65 }}>{testReply}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
