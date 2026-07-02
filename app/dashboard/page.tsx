'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import DailyMessage from '@/components/DailyMessage'
import NotificationBell from '@/components/NotificationBell'
import { c, font, fontSerif, radius, card, label, muted, statNumber, btn, tabular, input as inputStyle } from '@/lib/theme'

// Week-over-week delta chip.
function Delta({ pct }: { pct: number }) {
  const flat = pct === 0
  const up = pct > 0
  const color = flat ? c.faint : up ? c.good : c.bad
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.74rem', fontWeight: 500, color, ...tabular }}>
      {flat ? '—' : up ? '↑' : '↓'} {Math.abs(pct)}% <span style={{ color: c.faint, fontWeight: 400 }}>7d</span>
    </span>
  )
}

// Least-squares projection of the next `steps` days from a daily series.
function forecastNext(seriesIn: number[], steps: number): number[] {
  const n = seriesIn.length
  if (n < 2) return Array(steps).fill(seriesIn[n - 1] || 0)
  let sx = 0, sy = 0, sxy = 0, sxx = 0
  seriesIn.forEach((y, x) => { sx += x; sy += y; sxy += x * y; sxx += x * x })
  const denom = n * sxx - sx * sx
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0
  const intercept = (sy - slope * sx) / n
  return Array.from({ length: steps }, (_, i) => Math.max(0, intercept + slope * (n + i)))
}

// Actual (solid + area) vs forecast (dashed) line chart, scaled together.
function AreaForecast({ actual, forecast, height = 200 }: { actual: number[]; forecast: number[]; height?: number }) {
  const W = 600, H = height
  const all = [...actual, ...forecast]
  const max = Math.max(...all, 1)
  const n = all.length
  const px = (i: number) => (i / Math.max(n - 1, 1)) * W
  const py = (v: number) => H - (v / max) * (H - 16) - 8
  const line = (vals: number[], offset: number) =>
    vals.map((v, i) => `${i ? 'L' : 'M'}${px(offset + i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')
  const actualLine = line(actual, 0)
  const area = `${actualLine} L${px(actual.length - 1).toFixed(1)},${H} L0,${H} Z`
  const fcLine = line([actual[actual.length - 1] ?? 0, ...forecast], actual.length - 1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: `${H}px`, display: 'block' }} aria-hidden="true">
      <path d={area} fill={c.ink} fillOpacity="0.05" />
      <path d={actualLine} fill="none" stroke={c.ink} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={fcLine} fill="none" stroke={c.faint} strokeWidth="1.5" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

interface Message {
  id: string
  from_username: string
  from_handle?: string | null
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

// Not every lead becomes a paying customer. The forecast used to value each
// projected lead at the FULL deal value (an implicit 100% close rate), which
// wildly overstated pipeline (e.g. 94 leads → $141k). Apply a conservative
// close-rate assumption so the projection reflects expected *closed* revenue.
const ASSUMED_CLOSE_RATE = 0.2

export default function Dashboard() {
  const [clientName, setClientName] = useState('')
  const [avgDealValue, setAvgDealValue] = useState(DEFAULT_DEAL_VALUE)
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState({ total: 0, leads: 0, escalated: 0, today: 0, todayLeads: 0 })
  const [series30, setSeries30] = useState<number[]>(Array(30).fill(0))
  const [week, setWeek] = useState({ msgs: 0, leads: 0, dMsgs: 0, dLeads: 0, conv: 0, dConv: 0 })
  const [testMessage, setTestMessage] = useState('')
  const [testReply, setTestReply] = useState('')
  const [loading, setLoading] = useState(false)

  const [briefing, setBriefing] = useState('')
  const [briefingLeads, setBriefingLeads] = useState<BriefingLead[]>([])
  const [briefingLoading, setBriefingLoading] = useState(true)
  const [briefingTime, setBriefingTime] = useState('')
  const [flashId, setFlashId] = useState<string | null>(null)

  // First-run setup progress, derived from the client's own record.
  const [setup, setSetup] = useState({ loaded: false, voice: false, instagram: false, hasMessages: false })

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

      setSetup({
        loaded: true,
        voice: !!(client.voice_profile && client.voice_profile.trim()),
        instagram: !!client.instagram_account_id,
        hasMessages: !!(msgs && msgs.length > 0),
      })

      if (msgs) {
        setMessages(msgs.slice(0, 5))
        setStats({
          total: msgs.length,
          leads: msgs.filter(m => m.is_lead).length,
          escalated: msgs.filter(m => m.status === 'escalated').length,
          today: msgs.filter(m => isToday(m.created_at)).length,
          todayLeads: msgs.filter(m => m.is_lead && isToday(m.created_at)).length,
        })

        // 30-day daily series → drives the chart, forecast, and 7d deltas.
        const now = new Date()
        const s = Array(30).fill(0)
        const ls = Array(30).fill(0)
        msgs.forEach(m => {
          const daysAgo = Math.floor((now.getTime() - new Date(m.created_at).getTime()) / 86400000)
          if (daysAgo < 30) {
            s[29 - daysAgo]++
            if (m.is_lead) ls[29 - daysAgo]++
          }
        })
        setSeries30(s)
        const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
        const m7 = sum(s.slice(23)), mPrev = sum(s.slice(16, 23))
        const l7 = sum(ls.slice(23)), lPrev = sum(ls.slice(16, 23))
        const pctd = (cur: number, prev: number) => prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0)
        const conv = m7 > 0 ? Math.round((l7 / m7) * 100) : 0
        const convPrev = mPrev > 0 ? Math.round((lPrev / mPrev) * 100) : 0
        setWeek({ msgs: m7, leads: l7, dMsgs: pctd(m7, mPrev), dLeads: pctd(l7, lPrev), conv, dConv: pctd(conv, convPrev) })
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

  const pipelineValue = Math.round(
    briefingLeads.reduce((sum, l) => sum + (l.score / 100) * avgDealValue, 0)
  )

  // Forecast: next 14 days for the chart, next 30 for the projection sentence.
  const fc14 = forecastNext(series30, 14)
  const projDMs = Math.round(forecastNext(series30, 30).reduce((a, b) => a + b, 0))
  const projLeads = Math.round(projDMs * (week.conv / 100))
  const projPipeline = Math.round(projLeads * avgDealValue * ASSUMED_CLOSE_RATE)

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

  const ledger: { l: string; v: string | number; d?: number; sub?: string }[] = [
    { l: 'Replies · 7d', v: week.msgs, d: week.dMsgs },
    { l: 'Leads · 7d', v: week.leads, d: week.dLeads },
    { l: 'Conversion', v: `${week.conv}%`, d: week.dConv },
    { l: 'Total DMs', v: stats.total, sub: 'all time' },
    { l: 'Pipeline', v: `$${pipelineValue.toLocaleString()}`, sub: briefingLoading ? 'estimating…' : `${briefingLeads.length} open` },
  ]

  const shimmer = (w: number, i: number) => (
    <div key={i} style={{ height: '13px', width: `${w}%`, borderRadius: '6px', background: 'linear-gradient(90deg,#f0f0f1,#e7e7e9,#f0f0f1)', backgroundSize: '200% 100%', animation: 'waltershimmer 1.4s ease-in-out infinite' }} />
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: font, background: c.bg }}>
      <Sidebar active="Dashboard" />

      <main style={{ marginLeft: '244px', flex: 1, padding: '2.25rem 2.5rem', maxWidth: 1180 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1.1rem', borderBottom: `1px solid ${c.border}`, marginBottom: '1.25rem' }}>
          <div>
            <p style={{ ...label, marginBottom: '0.4rem' }}>Overview</p>
            <h1 style={{ fontFamily: fontSerif, fontSize: '2rem', fontWeight: 500, color: c.ink, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
              {getGreeting()}{clientName ? `, ${clientName}` : ''}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <span style={{ fontSize: '0.76rem', color: c.faint }}>
              {new Date().toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric' })} · as of {new Date().toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: c.surface, border: `1px solid ${c.border}`, borderRadius: radius.pill, padding: '0.4rem 0.8rem' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', animation: 'walterpulse 1.6s ease-in-out infinite' }} />
              <span style={{ fontSize: '0.8rem', color: c.body, fontWeight: 500 }}>Live</span>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Daily note from Ethan — newest admin broadcast, dismissible. */}
        <DailyMessage />

        {/* First-run setup checklist — shows until voice + Instagram are set up. */}
        {setup.loaded && !(setup.voice && setup.instagram) && (
          <div style={{ ...card, marginBottom: '1rem', borderColor: c.ink }}>
            <p style={{ ...label, color: c.ink, marginBottom: '0.3rem' }}>Finish setting up</p>
            <p style={{ ...muted, marginBottom: '1.1rem' }}>A couple of quick steps and Walter starts replying to your DMs.</p>
            {([
              { done: setup.voice, title: 'Train your voice profile', desc: 'Teach Walter how you talk.', href: '/dashboard/voice', cta: 'Set up' },
              { done: setup.instagram, title: 'Connect Instagram', desc: 'Link your account so Walter can reply.', href: '/dashboard/connections', cta: 'Connect' },
            ]).map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.7rem 0', borderTop: i > 0 ? `1px solid ${c.border}` : 'none' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', background: step.done ? '#22c55e' : c.surfaceAlt, color: step.done ? '#fff' : c.faint, border: step.done ? 'none' : `1px solid ${c.border}` }}>
                  {step.done ? '✓' : i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 500, color: c.ink, textDecoration: step.done ? 'line-through' : 'none', opacity: step.done ? 0.6 : 1 }}>{step.title}</p>
                  {!step.done && <p style={{ fontSize: '0.78rem', color: c.muted }}>{step.desc}</p>}
                </div>
                {!step.done && (
                  <a href={step.href} style={{ ...btn, textDecoration: 'none', padding: '0.45rem 1rem', fontSize: '0.82rem' }}>{step.cta} →</a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Walter's read — AI briefing strip */}
        <div style={{ ...card, marginBottom: '1rem', display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
          <div style={{ width: 34, height: 34, borderRadius: radius.md, background: c.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem', color: c.ink }}>✦</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.72rem', color: c.faint, marginBottom: '0.4rem' }}>Walter&apos;s read{briefingTime ? ` · ${briefingTime}` : ''}</p>
            {briefingLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{[88, 64].map(shimmer)}</div>
            ) : (
              <p style={{ fontSize: '0.95rem', lineHeight: 1.55, color: c.body }}>{briefing}</p>
            )}
          </div>
        </div>

        {/* Ledger band — five figures split by hairlines */}
        <div style={{ ...card, padding: 0, marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', overflow: 'hidden' }}>
          {ledger.map((m, i) => (
            <div key={m.l} style={{ padding: '1.25rem 1.35rem', borderLeft: i > 0 ? `1px solid ${c.border}` : 'none' }}>
              <p style={{ ...label, marginBottom: '0.7rem' }}>{m.l}</p>
              <p style={{ ...statNumber, marginBottom: '0.5rem' }}>{m.v}</p>
              {m.d !== undefined ? <Delta pct={m.d} /> : <p style={{ color: c.faint, fontSize: '0.74rem' }}>{m.sub}</p>}
            </div>
          ))}
        </div>

        {/* Activity + forecast */}
        <div style={{ ...card, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
            <div>
              <p style={{ ...label, marginBottom: '0.3rem' }}>Activity</p>
              <p style={{ color: c.faint, fontSize: '0.8rem' }}>DMs handled — last 30 days, with 14-day forecast</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: c.muted, alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: 14, height: 2, background: c.ink, display: 'inline-block' }} />Actual</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: 14, height: 0, borderTop: `2px dashed ${c.faint}`, display: 'inline-block' }} />Forecast</span>
            </div>
          </div>
          <AreaForecast actual={series30} forecast={fc14} />
          <p style={{ fontSize: '0.85rem', color: c.muted, lineHeight: 1.6, borderTop: `1px solid ${c.border}`, paddingTop: '0.9rem', marginTop: '0.9rem' }}>
            On your last 30 days&apos; trend, you&apos;re on track for about <strong style={{ color: c.ink, fontWeight: 600 }}>{projDMs} DMs</strong> and <strong style={{ color: c.ink, fontWeight: 600 }}>{projLeads} leads</strong> next month{projPipeline > 0 ? <> — roughly <strong style={{ color: c.ink, fontWeight: 600 }}>${projPipeline.toLocaleString()}</strong> in estimated revenue at a {Math.round(ASSUMED_CLOSE_RATE * 100)}% close rate</> : ''}.
          </p>
        </div>

        {/* Funnel + Act now */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={card}>
            <p style={{ ...label, marginBottom: '0.3rem' }}>Conversion funnel</p>
            <p style={{ color: c.faint, fontSize: '0.8rem', marginBottom: '1.5rem' }}>Message to lead</p>
            {[
              { label: 'Messages', value: stats.total, pct: 100 },
              { label: 'Leads', value: stats.leads, pct: stats.total > 0 ? Math.round((stats.leads / stats.total) * 100) : 0 },
              { label: 'Escalated', value: stats.escalated, pct: stats.total > 0 ? Math.round((stats.escalated / stats.total) * 100) : 0 },
            ].map((row, i) => (
              <div key={i} style={{ marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <p style={{ color: c.muted, fontSize: '0.8rem' }}>{row.label}</p>
                  <p style={{ color: c.ink, fontSize: '0.8rem', fontWeight: 500, ...tabular }}>{row.value}</p>
                </div>
                <div style={{ background: c.surfaceAlt, borderRadius: '4px', height: '5px' }}>
                  <div style={{ background: c.ink, borderRadius: '4px', height: '5px', width: `${row.pct}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={card}>
            <p style={{ ...label, marginBottom: '0.3rem' }}>Act now</p>
            <p style={{ color: c.faint, fontSize: '0.8rem', marginBottom: '1.25rem' }}>Ranked by buying intent</p>
            {briefingLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{[90, 80, 70].map(shimmer)}</div>
            ) : briefingLeads.length === 0 ? (
              <p style={{ color: c.faint, fontSize: '0.85rem' }}>No hot leads right now — Walter&apos;s watching every DM.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {briefingLeads.map((lead, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: c.ink, width: '96px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{lead.username}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ height: '5px', background: c.surfaceAlt, borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${lead.score}%`, height: '100%', background: c.ink, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: c.muted, width: '24px', textAlign: 'right', ...tabular }}>{lead.score}</span>
                    <a href="/dashboard/inbox" style={{ fontSize: '0.76rem', fontWeight: 500, color: i === 0 ? '#fff' : c.body, background: i === 0 ? c.ink : c.surface, border: `1px solid ${i === 0 ? c.ink : c.border}`, borderRadius: radius.sm, padding: '0.3rem 0.7rem', textDecoration: 'none' }}>Reply</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live activity + AI test */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <p style={label}>Live activity</p>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: c.faint }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'walterpulse 1.6s ease-in-out infinite' }} /> real-time
              </span>
            </div>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: c.faint }}>
                <p style={{ fontSize: '0.85rem' }}>No messages yet</p>
              </div>
            ) : messages.map(msg => (
              <div key={msg.id} style={{ paddingBottom: '0.9rem', marginBottom: '0.9rem', borderBottom: `1px solid ${c.border}`, background: flashId === msg.id ? '#f0fdf4' : 'transparent', borderLeft: flashId === msg.id ? '2px solid #22c55e' : '2px solid transparent', paddingLeft: '0.6rem', marginLeft: '-0.6rem', borderRadius: '0 4px 4px 0', transition: 'background 0.6s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, color: c.ink }}>@{msg.from_handle || msg.from_username}</p>
                  {msg.is_lead && <span style={{ fontSize: '0.62rem', fontWeight: 500, background: c.ink, color: '#fff', padding: '0.15rem 0.45rem', borderRadius: '5px' }}>LEAD</span>}
                </div>
                <p style={{ fontSize: '0.82rem', color: c.muted, marginBottom: '0.2rem' }}>{msg.content}</p>
                <p style={{ fontSize: '0.8rem', color: c.faint }}>↳ {msg.ai_reply}</p>
              </div>
            ))}
          </div>

          <div style={card}>
            <p style={{ ...label, marginBottom: '0.3rem' }}>Test your AI</p>
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
              {loading ? 'Generating…' : 'Generate reply →'}
            </button>
            {testReply && (
              <div style={{ marginTop: '1.1rem', padding: '1.1rem', background: c.surfaceAlt, borderRadius: radius.md, borderLeft: `2px solid ${c.ink}` }}>
                <p style={{ ...label, marginBottom: '0.5rem' }}>AI response</p>
                <p style={{ color: c.body, fontSize: '0.875rem', lineHeight: 1.65 }}>{testReply}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
